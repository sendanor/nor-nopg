/**
 * nor-nopg -- NoSQL database library for PostgreSQL
 * Copyright 2014 Sendanor <info@sendanor.fi>,
 *           2014 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

"use strict";

var debug = require('nor-debug');
var ARRAY = require('nor-array');
var FUNCTION = require('nor-function');

// Make NOPG_EVENT_TIMES as obsolete
if( (process.env.NOPG_EVENT_TIMES !== undefined) && (process.env.DEBUG_NOPG_EVENT_TIMES === undefined) ) {
	debug.warn('Please use DEBUG_NOPG_EVENT_TIMES instead of obsolete NOPG_EVENT_TIMES');
	process.env.DEBUG_NOPG_EVENT_TIMES = process.env.NOPG_EVENT_TIMES;
}

var util = require('util');
var $Q = require('q');
var is = require('nor-is');
var fs = require('nor-fs');
var pg = require('nor-pg');
var extend = require('nor-extend').setup({useFunctionPromises:true});
var orm = require('./orm');
var merge = require('merge');
var pghelpers = require('./pghelpers.js');
var Query = require('./query.js');
var InsertQuery = require('./insert_query.js');
var Predicate = require('./Predicate.js');

/* ------- (OPTIONAL) NEWRELIC SUPPORT ---------- */

var nr_fcall = require('nor-newrelic/src/fcall.js');

/* ------------- HELPER FUNCTIONS --------------- */

/** Returns seconds between two date values
 * @returns {number} Time between two values (ms)
 */
function _get_ms(a, b) {
	debug.assert(a).is('date');
	debug.assert(b).is('date');
	if(a < b) {
		return b.getTime() - a.getTime();
	}
	return a.getTime() - b.getTime();
}

/** Optionally log time */
function _log_time(sample) {

	debug.assert(sample).is('object');
	debug.assert(sample.event).is('string');
	debug.assert(sample.start).is('date');
	debug.assert(sample.end).is('date');
	debug.assert(sample.duration).ignore(undefined).is('number');
	debug.assert(sample.query).ignore(undefined).is('string');
	debug.assert(sample.params).ignore(undefined).is('array');

	var msg = 'NoPg event ' + sample.event + ' in ' + sample.duration + ' ms';
	if(sample.query || sample.params) {
		msg += ': ';
	}
	if(sample.query) {
		msg += 'query=' + util.inspect(sample.query);
		if(sample.params) {
			msg += ', ';
		}
	}
	if(sample.params) {
		msg += 'params=' + util.inspect(sample.params);
	}
	debug.log(msg);

}

/** The constructor */
function NoPg(db) {
	var self = this;
	if(!db) { throw new TypeError("db invalid: " + util.inspect(db) ); }
	self._db = db;
	self._values = [];
	self._tr_state = 'open';
	self._stats = [];
	self._cache = {
		'types': {},
		'objects': {}
	};
}

// Exports
module.exports = NoPg;

function get_true_value(value) {
	if(!value) { return false; }
	if(value === true) { return true; }
	value = ('' + value).toLowerCase();
	if(value === "false") { return false; }
	if(value === "off") { return false; }
	if(value === "no") { return false; }
	if(value === "0") { return false; }
	return true;
}

NoPg.debug = get_true_value(process.env.DEBUG_NOPG);

// Addons
NoPg.strip = require('./strip.js');
NoPg.types = require('./types.js');
NoPg.ResourceView = require('./ResourceView.js');

// Object constructors
NoPg.Document = orm.Document;
NoPg.Type = orm.Type;
NoPg.Attachment = orm.Attachment;
NoPg.Lib = orm.Lib;
NoPg.DBVersion = orm.DBVersion;

/** Take first result from the database query and returns new instance of `Type` */
function _get_result(Type) {
	return function(rows) {
		if(!rows) { throw new TypeError("failed to parse result"); }
		var doc = rows.shift();
		if(!doc) { return; }

		if(doc instanceof Type) {
			return doc;
		}

		var obj = {};
		ARRAY(Object.keys(doc)).forEach(function(key) {

			if(key === 'documents') {
				obj['$'+key] = {};
				ARRAY(Object.keys(doc[key])).forEach(function(k) {
					if(is.uuid(k)) {
						obj['$'+key][k] = _get_result(NoPg.Document)([doc[key][k]]);
					} else {
						obj['$'+key][k] = doc[key][k];
					}
				});
				return;
			}

			obj['$'+key] = doc[key];
		});

		_parse_object_expressions(obj);

		return new Type(obj);
	};
}

/** Take all results from the database query and return an array of new instances of `Type` */
function get_results(Type, opts) {
	opts = opts || {};

	var field_map;
	if(is.func(opts.fieldMap)) {
		field_map = opts.fieldMap;
	} else if(is.obj(opts.fieldMap)) {
		field_map = function(k) {
			return opts.fieldMap[k];
		};
	}

	/** Parse field */
	function parse_field(obj, key, value) {
		debug.assert(obj).is('object');
		//debug.log('obj = ', obj);
		//debug.log('key = ', key);
		//debug.log('value = ', value);

		/* Parse full top level field */
		function parse_field_top(obj, key, value) {
			if( is.array(obj['$'+key]) ) {
				obj['$'+key] = obj['$'+key].concat(value);
			} else if( is.obj(obj['$'+key]) ) {
				obj['$'+key] = merge(obj['$'+key], value);
			} else {
				obj['$'+key] = value;
			}
		}

		/* Parse property in top level field based on a key as an array `[datakey, property_name]` */
		function parse_field_property(obj, key, value) {
			//debug.log('key = ', key);
			var a = key[0];
			var b = key[1];
			//debug.log('key_a = ', a);
			//debug.log('key_b = ', b);

			if(!is.obj(obj['$'+a])) {
				obj['$'+a] = {};
			}

			obj['$'+a][b] = value;
		}

		/* Parse property in top level field based on key in PostgreSQL JSON format */
		function parse_field_property_pg(obj, key, value) {
			//debug.log('key = ', key);
			/*jslint regexp: false*/
			var matches = /^([a-z][a-z0-9\_]*)\-\>\>'([^\']+)'$/.exec(key);
			/*jslint regexp: true*/
			var a = matches[1];
			var b = matches[2];
			return parse_field_property_pg(obj, [a,b], value);
		}

		//
		var new_key;
		if( is.func(field_map) && (new_key = field_map(key)) ) {
			if( (new_key) && (new_key !== key) ) {
				return parse_field(obj, new_key, value);
			}
		}

		if( is.array(key) ) {
			parse_field_property(obj, key, value);
		} else if( is.string(key) && (/^[a-z][a-z0-9\_]*$/.test(key)) ) {
			parse_field_top(obj, key, value);
		/*jslint regexp: false*/
		} else if ( is.string(key) && (/^([a-z][a-z0-9\_]*)\-\>\>'([^\']+)'$/.test(key)) ) {
		/*jslint regexp: true*/
			parse_field_property_pg(obj, key, value);
		} else {
			//debug.log('key = ', key);
			throw new TypeError("Unknown field name: " + key);
		}
	}

	/* Returns a function which will go through rows and convert them to NoPg format */
	return function(rows) {
		return ARRAY(rows).map(function(row, i) {
			if(!row) { throw new TypeError("failed to parse result #" + i + " from database!"); }
			//debug.log('input in row = ', row);

			//debug.log('row = ', row);

			if(row instanceof Type) {
				return row;
			}

			var obj = {};
			ARRAY(Object.keys(row)).forEach(function(key) {

				if(key === 'documents') {
					obj['$'+key] = {};
					ARRAY(Object.keys(row[key])).forEach(function(uuid) {
						if(!is.uuid(uuid)) {
							obj['$'+key][uuid] = row[key][uuid];
							return;
						}
						var sub_doc = row[key][uuid];
						var sub_obj = {};
						ARRAY(Object.keys(sub_doc)).forEach(function(k) {
							parse_field(sub_obj, k, sub_doc[k]);
						});
						obj['$'+key][uuid] = new NoPg.Document(sub_obj);
					});
					return;
				}

				parse_field(obj, key, row[key]);
			});

			_parse_object_expressions(obj);

			//debug.log('result in obj = ', obj);
			return new Type(obj);
		}).valueOf();
	};
}

/** Takes the result and saves it into `self`. If `self` is one of `NoPg.Document`, 
 * `NoPg.Type`, `NoPg.Attachment` or `NoPg.Lib`, then the content is updated into 
 * that instance. If the `doc` is an instance of `NoPg` then the result can be 
 * fetched using `self.fetch()`.
 */
function save_result_to(self) {
	if( is.obj(self) && is.func(self.nopg) ) {
		return function(doc) { return self.update(doc); };
	}

	if( is.obj(self) && is.array(self._values) ) {
		return function(doc) {
			self._values.push( doc );
			return self;
		};
	}

	throw new TypeError("Unknown target: " + (typeof self));
}

/** Takes the result and saves it into `self`. If the `self` is an instance of `NoPg` then the result can be fetched using `self.fetch()`. */
function save_result_to_queue(self) {

	if(self._values) {
		return function(objs) {
			self._values.push( objs );
			return self;
		};
	}

	throw new TypeError("Unknown target: " + (typeof self));
}

/** Returns the data key of Type */
function get_predicate_datakey(Type) {
	return (Type.meta.datakey || '$meta').substr(1);
}

// Pre-define function
var parse_predicate_document_relations;

/** */
function parse_keyref_json(datakey, key) {
	if(key.indexOf('.') === -1) {
		//      json_extract_path(content, VARIADIC ARRAY['["user"]'::json ->> 0])::text
		//return "json_extract_path(" + datakey + ", '" + JSON.stringify([key]) + "'::json ->> 0)::text";
		return "(" + datakey + " -> '" + key + "'::text)";
	} else {
		//return "json_extract_path(" + datakey + ", '" + JSON.stringify(key.split('.')) + "'::json ->> 0)::text";
		return "(" + datakey + " #> '{" + key.split('.').join(',') +"}')";
	}
}

/** */
function parse_keyref_text(datakey, key) {
	if(key.indexOf('.') === -1) {
		//      json_extract_path(content, VARIADIC ARRAY['["user"]'::json ->> 0])::text
		//return "json_extract_path(" + datakey + ", '" + JSON.stringify([key]) + "'::json ->> 0)::text";
		return "(" + datakey + " ->> '" + key + "'::text)";
	} else {
		//return "json_extract_path(" + datakey + ", '" + JSON.stringify(key.split('.')) + "'::json ->> 0)::text";
		return "(" + datakey + " #>> '{" + key.split('.').join(',') +"}')";
	}
}

/** Returns PostgreSQL keyword for NoPg keyword. Converts `$foo` to `foo` and `foo` to `meta->'foo'` etc.
 * @param Type
 * @param key {string} The NoPg keyword
 * @param opts
 */
function _parse_predicate_key(Type, opts, key) {
	opts = opts || {};

	if(key[0] !== '$') {
		var datakey = get_predicate_datakey(Type);
		//return new Predicate( "json_extract_path("+datakey+", '"+JSON.stringify([key])+"'::json->>0)::text", [], {'datakey': datakey, 'key': key});
		return new Predicate( parse_keyref_json(datakey, key), [], {'datakey': datakey, 'key': key});
	}

	var _key = key.substr(1);

	if( (opts.epoch === true) && ( (key === '$created') || (key === '$modified') ) ) {
		return new Predicate("to_json(extract(epoch from "+_key+")*1000)", [], {'key':_key});
	}

	if(key === '$documents') {
		var documents = (opts && opts.traits && opts.traits.documents) || [];
		debug.assert(documents).is('array');
		return new Predicate("get_documents(row_to_json("+(Type.meta.table)+".*), $::json)", [
			JSON.stringify(parse_predicate_document_relations(Type, documents))
		], {'key':_key});
	}

	return new Predicate(_key, [], {'key':_key});
}

/** Convert NoPg keywords to internal PostgreSQL name paths for PostgreSQL get_documents() function
 * Note! documents might contain data like `['user|name,email']` which tells the field list and should be converted to PostgreSQL names here.
 */
parse_predicate_document_relations = function parse_predicate_document_relations(ObjType, documents) {
	return ARRAY(documents).map(function(d) {

		var parts = d.split('|');
		var prop = parts.shift();
		var fields = parts.join('|') || '*';

		fields = ARRAY(fields.split(',')).map(function(f) {
			if(f === '*') { return {'query':'*'}; }
			var p = _parse_predicate_key(ObjType, {'traits': {}, 'epoch':false}, f);
			return {
				'name': f,
				'datakey': p.getMeta('datakey'),
				'key': p.getMeta('key'),
				'query': p.getString()
			};
		}).valueOf();

		//debug.log('fields = ', JSON.stringify(fields, null, 2) );

		if(prop && (prop.length >= 1) && (prop[0] === '$')) {
			return {
				'prop': prop.substr(1),
				'fields': fields
			};
		}

		return {
			'prop': get_predicate_datakey(ObjType) + '.' + prop,
			'fields': fields
		};
	}).valueOf();
};

/** Returns true if first letter is dollar */
var first_letter_is_dollar = require('./first_letter_is_dollar.js');

/** @FIXME Implement escape? */
function is_valid_key(key) {
	var keyreg = /^[a-zA-Z0-9_\-\.]+$/;
	return keyreg.test(key);
}

/** */
function parse_meta_properties(res, opts, datakey, key) {
	if(!is_valid_key(key)) { throw new TypeError("Invalid keyword: " + key); }
	var keyref = parse_keyref_text(datakey, key);
	// FIXME: This should use same code as indexes?
	if(is.boolean(opts[key])) {
		res["(("+keyref+")::boolean IS TRUE)"] = (opts[key] === true) ? 'true' : 'false';
	} else if(is.number(opts[key])) {
		res["("+keyref+")::numeric"] = opts[key];
	} else {
		res[keyref] = ''+opts[key];
	}
}

/** */
function parse_top_level_properties(res, opts, key) {
	var k = key.substr(1);
	res[k] = opts[key];
}

/** Convert properties like {"$foo":123} -> "foo = 123" and {foo:123} -> "(meta->'foo')::numeric = 123" and {foo:"123"} -> "meta->'foo' = '123'"
 * Usage: `var where = parse_predicates(NoPg.Document)({"$foo":123})`
 */
function parse_predicates(Type) {

	//function first_letter_not_dollar(k) {
	//	return k[0] !== '$';
	//}

	function parse_data(opts) {
		debug.assert(opts).ignore(undefined).is('object');

		opts = opts || {};
		var datakey = get_predicate_datakey(Type);
		var res = {};
		ARRAY(Object.keys(opts)).forEach(function(i) {
			if(first_letter_is_dollar(i)) {
				// Parse top level properties
				parse_top_level_properties(res, opts, i);
			} else {
				// Parse meta properties
				parse_meta_properties(res, opts, datakey, i);
			}
		});
		return res;
	}

	return parse_data;
}


/** Parse obj.$documents.expressions into the object */
function _parse_object_expressions(obj) {
	debug.assert(obj).is('object');
	if(!obj.$documents) {
		return;
	}

	var expressions = obj.$documents.expressions;
	if(!expressions) {
		return;
	}

	ARRAY(Object.keys(expressions)).forEach(function(prop) {
		var value = expressions[prop], key;
		// FIXME: This code should understand things better
		if(prop.substr(0, 'content.'.length) === 'content.') {
			key = prop.substr('content.'.length);
		} else {
			key = '$' + prop;
		}
		obj[key] = value;
	});
}

/* ------------- PRIVATE FUNCTIONS --------------- */


/** Perform generic query */
function do_query(self, query, values) {
	return nr_fcall("nopg:do_query", function() {

		if(!query) { throw new TypeError("invalid: query: " + util.inspect(query)); }
		if(NoPg.debug) {
			debug.log('query = ', query);
		}

		debug.assert(self).is('object');
		debug.assert(self._db).is('object');
		debug.assert(self._db._query).is('function');

		var start_time = new Date();
		return self._db._query(query, values).then(function(db) {
			var end_time = new Date();

			self._record_sample({
				'event': 'query',
				'start': start_time,
				'end': end_time,
				'query': query,
				'params': values
			});

			return db;
		});
	});
}

/* Returns the type condition and pushes new params to `params` */
function parse_where_type_condition_array(query, type) {
	var predicates = ARRAY(type).map(function(t) {
		if(is.string(t)) {
			return new Predicate("type = $", t);
		}
		if(type instanceof NoPg.Type) {
			return new Predicate("types_id = $", type.$id);
		}
		throw new TypeError("Unknown type: " + util.inspect(t));
	}).valueOf();
	query.where( Predicate.join(predicates, 'OR') );
}

/* Returns the type condition and pushes new params to `params` */
function parse_where_type_condition(query, type) {
	if(type === undefined) {
		return;
	}

	if(is.array(type)) {
		return parse_where_type_condition_array(query, type);
	}

	if(is.string(type)) {
		// NOTE: We need to use `get_type_id()` until we fix the possibility that some
		// older rows do not have correct `type` field -- these are rows that were created
		// before their current validation schema and do not pass it.
		query.where( new Predicate("types_id = get_type_id($)", type) );
		return;
	}

	if(type instanceof NoPg.Type) {
		query.where( new Predicate("types_id = $", type.$id) );
		return;
	}

	throw new TypeError("Unknown type: " + util.inspect(type));
}

/** Returns true if `i` is not `undefined` */
function not_undefined(i) {
	return i !== undefined;
}

/** */
function replace_last(x, from, to) {
	var i = x.lastIndexOf(from);
	if(i === -1) {
		return x;
	}
	x = x.substr(0, i) + to + x.substr(i+from.length);
	return x;
}

/** Functions to build casts for different types */
var _pgcasts = {
	'boolean': function pgcast_boolean(x) { return '(((' + x + ')::text)::boolean IS TRUE)'; },
	'numeric': function pgcast_numeric(x) { return '((' + x + ')::text)::numeric'; },
	'text': function pgcast_text(x) {
		if(x.indexOf(' -> ') !== -1) {
			return replace_last(x, ' -> ', ' ->> ');
		}

		if(x.indexOf(' #> ') !== -1) {
			return replace_last(x, ' #> ', ' #>> ');
		}

		//throw new TypeError('Cannot cast expression to text: ' + x);

		if(x.substr(0 - '::text'.length) === '::text') {
			return x;
		}

		if(x.substr(0 - '::text)'.length) === '::text)') {
			return x;
		}

		return '' + x + '::text';
	}
};

/** Returns the correct cast from JSON to PostgreSQL type */
function parse_predicate_pgcast_by_type(pgtype) {
	//debug.log('pgtype = ', pgtype);
	if(is.func(_pgcasts[pgtype])) {
		return _pgcasts[pgtype];
	}
	return function pgcast_default(x) { return '' + x + '::' + pgtype; };
}

/** Returns PostgreSQL type for key based on the schema
 * @FIXME Detect correct types for all keys
 */
function parse_predicate_pgtype(ObjType, document_type, key) {

	debug.assert(ObjType).is('function');
	debug.assert(document_type).ignore(undefined).is('object');

	var schema = (document_type && document_type.$schema) || {};
	debug.assert(schema).is('object');

	if(key[0] === '$') {

		if(key === '$version') {
			return 'numeric';
		}

		if( (key === '$created') || (key === '$modified') ) {
			return 'numeric';
		}

		if(key === '$type') {
			return 'text';
		}

	} else {

		var type;
		if(schema && schema.properties && schema.properties.hasOwnProperty(key) && schema.properties[key].type) {
			type = schema.properties[key].type;
		}

		if(type === 'number') {
			return 'numeric';
		}

		if(type === 'boolean') {
			return 'boolean';
		}

	}

	return 'text';
}

/** Returns the correct cast from JSON to PostgreSQL type */
function parse_predicate_pgcast(ObjType, document_type, key) {
	var pgtype = parse_predicate_pgtype(ObjType, document_type, key);
	return parse_predicate_pgcast_by_type(pgtype);
}

/** Parse array predicate */
function _parse_function_predicate(ObjType, q, def_op, o, ret_type) {
	debug.assert(o).is('array');

	ret_type = ret_type || 'boolean';

	// FIXME: This loop could be optimized to return directly once first function is found! #performance
	var func = ARRAY(o).filter(is.func).valueOf().shift();

	debug.assert(func).is('function');

	var i = o.indexOf(func);
	debug.assert(i).is('number');

	var input_nopg_keys = o.slice(0, i);
	var js_input_params = o.slice(i+1);

	debug.assert(input_nopg_keys).is('array');
	debug.assert(js_input_params).is('array');

	//debug.log('input_nopg_keys = ', input_nopg_keys);
	//debug.log('func = ', func);
	//debug.log('js_input_params = ', js_input_params);

	var _parse_predicate_key_epoch = FUNCTION(_parse_predicate_key).curry(ObjType, {'epoch':true});
	var input_pg_keys = ARRAY(input_nopg_keys).map(_parse_predicate_key_epoch);

	var pg_items = input_pg_keys.map(function(i) { return i.getString(); }).valueOf();
	var pg_params = input_pg_keys.map(function(i) { return i.getParams(); }).reduce(function(a, b) { return a.concat(b); });

	debug.assert(pg_items).is('array');
	debug.assert(pg_params).is('array');

	//debug.log('input_pg_keys = ', input_pg_keys);

	//var n = arg_params.length;
	//arg_params.push(JSON.stringify(FUNCTION(func).stringify()));
	//arg_params.push(JSON.stringify(js_input_params));

	var call_func = 'nopg.call_func(array_to_json(ARRAY['+pg_items.join(', ')+"]), $::json, $::json)";

	var type_cast = parse_predicate_pgcast_by_type(ret_type);

	return new Predicate(type_cast(call_func), pg_params.concat( [JSON.stringify(FUNCTION(func).stringify()), JSON.stringify(js_input_params)] ));
}

/** Returns true if op is AND, OR or BIND */
function parse_operator_name(op) {
	op = ''+op;
	op = op.split(':')[0];
	return op;
}

/** Returns true if op is AND, OR or BIND */
function parse_operator_type(op, def) {
	op = ''+op;
	if(op.indexOf(':') === -1) {
		return def || 'boolean';
	}
	return op.split(':')[1];
}

/** Returns true if op is AND, OR or BIND */
function is_operator(op) {
	op = parse_operator_name(op);
	return (op === 'AND') || (op === 'OR') || (op === 'BIND');
}

/* This object is because these functions need each other at the same time and must be defined before use. */
var _parsers = {};

/** Parse array predicate */
_parsers.parse_array_predicate = function _parse_array_predicate(ObjType, q, def_op, o) {
	var op = 'AND';

	if(is_operator(o[0])) {
		o = [].concat(o);
		op = o.shift();
	}

	if(parse_operator_name(op) === 'BIND') {
		return _parse_function_predicate(ObjType, q, def_op, o, parse_operator_type(op));
	}

	var parse_predicates = FUNCTION(_parsers.recursive_parse_predicates).curry(ObjType, q, def_op);
	var predicates = ARRAY(o).map( parse_predicates ).filter(not_undefined).valueOf();
	return Predicate.join(predicates, op);
};

/** Recursively parse predicates */
_parsers.recursive_parse_predicates = function _recursive_parse_predicates(ObjType, q, def_op, o) {

	if(o === undefined) { return; }

	if( is.array(o) ) {
		return _parsers.parse_array_predicate(ObjType, q, def_op, o);
	}

	if( is.obj(o) ) {
		o = parse_predicates(ObjType)(o, ObjType.meta.datakey.substr(1) );
		var predicates = ARRAY(Object.keys(o)).map(function(k) {
			return new Predicate('' + k + ' = $', [o[k]]);
		}).valueOf();
		return Predicate.join(predicates, def_op);
	}

	return new Predicate(''+o);
};

// Exports as normal functions
var _recursive_parse_predicates = FUNCTION(_parsers.recursive_parse_predicates).curry();

/** Parse traits object */
function parse_search_traits(traits) {
	traits = traits || {};

	// Initialize fields as all fields
	if(!traits.fields) {
		traits.fields = ['$*'];
	}

	// If fields was not an array (but is not negative -- check previous if clause), lets make it that.
	if(!is.array(traits.fields)) {
		traits.fields = [traits.fields];
	}

	debug.assert(traits.fields).is('array');

	// Append '$documents' to fields if traits.documents is specified and it is missing from there
	if(traits.documents && (traits.fields.indexOf('$documents') === -1) ) {
		traits.fields = traits.fields.concat(['$documents']);
	}

	// Order by $created by default
	if(!traits.order) {
		// FIXME: Check if `$created` exists in the ObjType!
		traits.order = ['$created'];
	}

	if(!is.array(traits.order)) {
		traits.order = [traits.order];
	}

	debug.assert(traits.order).is('array');

	if(traits.limit) {
		if(!traits.order) {
			debug.warn('Limit without ordering will yeald unpredictable results!');
		}

		if((''+traits.limit).toLowerCase() === 'all') {
			traits.limit = 'ALL';
		} else {
			traits.limit = '' + parseInt(traits.limit, 10);
		}
	}

	if(traits.offset) {
		traits.offset = parseInt(traits.offset, 10);
	}

	if(traits.hasOwnProperty('prepareOnly')) {
		traits.prepareOnly = traits.prepareOnly === true;
	}

	return traits;
}

/** Parses internal fields from nopg style fields
 * 
 */
function parse_select_fields(ObjType, traits) {
	debug.assert(ObjType).is('function');
	debug.assert(traits).ignore(undefined).is('object');
	return ARRAY(traits.fields).map(function(f) {
		return _parse_predicate_key(ObjType, {'traits': traits, 'epoch':false}, f);
	}).valueOf();
}

/** Parse opts object */
function parse_search_opts(opts, traits) {

	if(opts === undefined) {
		return;
	}

	if(is.array(opts)) {
		if( (opts.length >= 1) && is.obj(opts[0]) ) {
			return [ ((traits.match === 'any') ? 'OR' : 'AND') ].concat(opts);
		}
		return opts;
	}

	if(opts instanceof NoPg.Type) {
		return [ "AND", { "$id": opts.$id } ];
	}

	if(is.obj(opts)) {
		return [ ((traits.match === 'any') ? 'OR' : 'AND') , opts];
	}

	return [ "AND", {"$name": ''+opts} ];
}

/** Generate ORDER BY using `traits.order` */
function _parse_select_order(ObjType, document_type, order, q) {

	debug.assert(ObjType).is('function');
	debug.assert(document_type).ignore(undefined).is('object');
	debug.assert(order).is('array');

	return ARRAY(order).map(function(o) {
		var key, type, rest;
		if(is.array(o)) {
			key = parse_operator_name(o[0]);
			type = parse_operator_type(o[0], 'text');
			rest = o.slice(1);
		} else {
			key = parse_operator_name(o);
			type = parse_operator_type(o, 'text');
			rest = [];
		}

		if(key === 'BIND') {
			return _parse_function_predicate(ObjType, q, undefined, rest, type);
		}

		//debug.log('key = ', key);
		var parsed_key = _parse_predicate_key(ObjType, {'epoch':true}, key);
		//debug.log('parsed_key = ', parsed_key);
		var pgcast = parse_predicate_pgcast(ObjType, document_type, key);
		//debug.log('pgcast = ', pgcast);

		return new Predicate( [pgcast(parsed_key.getString())].concat(rest).join(' '), parsed_key.getParams(), parsed_key.getMetaObject() );
	}).valueOf();
}

/** Get type object using only do_query() */
function _get_type_by_name(self, document_type) {
	return do_query(self, "SELECT * FROM types WHERE name = $1", [document_type]).then(get_results(NoPg.Type)).then(function(results) {
		debug.assert(results).is('array');
		if(results.length !== 1) {
			if(results.length === 0) {
				throw new TypeError("Database has no type: " + document_type);
			}
			throw new TypeError("Database has multiple types: " + document_type + " (" + results.length + ")");
		}
		var result = results.shift();
		debug.assert(result).is('object');
		return result;
	});
}

/** Returns the query object for SELECT queries
 * @param self {object} The NoPg connection/transaction object
 * @param types {} 
 * @param search_opts {} 
 * @param traits {object} 
 */
function prepare_select_query(self, types, search_opts, traits) {
	var ObjType, document_type, document_type_obj;
	return nr_fcall("nopg:prepare_select_query", function() {

		// If true then this is recursive function call
		var _recursive = false;
		if(is.obj(traits) && traits._recursive) {
			_recursive = traits._recursive;
		}

		//
		if( is.array(search_opts) && (search_opts.length === 1) && is_operator(search_opts[0]) ) {
			throw new TypeError('search_opts invalid: ' + util.inspect(search_opts) );
		}

		// Object type and document type
		if(is.array(types)) {
			types = [].concat(types);
			ObjType = types.shift();
			document_type = types.shift();
		} else {
			ObjType = types;
		}

		// Create the initial query object
		var q = new Query({
			'method': 'select',
			'ObjType': ObjType
		});

		// Traits for search operation
		traits = parse_search_traits(traits);

		// Search options for documents
		search_opts = parse_search_opts(search_opts, traits);

		// Fields to search for
		var fields = parse_select_fields(ObjType, traits);
		q.fields(fields);

		/* Build `type_condition` */

		// If we have the document_type we can limit the results with it
		if(document_type) {
			parse_where_type_condition(q, document_type);
		}

		/* Parse `opts_condition` */

		var type_predicate = search_opts ? _recursive_parse_predicates(ObjType, q, ((traits.match === 'any') ? 'OR' : 'AND'), search_opts) : undefined;
		if(type_predicate) {
			q.where(type_predicate);
		}

		if(traits.limit) {
			q.limit(traits.limit);
		}

		if(traits.offset) {
			q.offset(traits.offset);
		}

		if(is.obj(document_type) && (document_type instanceof NoPg.Type) ) {
			document_type_obj = document_type;
		}

		return $Q.fcall(function() {

			// Only search type if it is missing, and traits.order is in use and this is not recursive call
			if(! (traits.order && (!document_type_obj) && is.string(document_type) && (!_recursive)) ) {
				return q;
			}

			return _get_type_by_name(self, document_type).then(function(type) {
				document_type_obj = type;
				return q;
			});

		}).then(function our_query(q) {

			if(traits.order) {
				q.orders( _parse_select_order(ObjType, document_type_obj, traits.order, q) );
			}

			return q;
		});

	}); // nr_fcall
}

/** Generic SELECT query
 * @param self {object} The NoPg connection/transaction object
 * @param types {} 
 * @param search_opts {} 
 * @param traits {object} 
 */
function do_select(self, types, search_opts, traits) {
	return nr_fcall("nopg:do_select", function() {
		return prepare_select_query(self, types, search_opts, traits).then(function(q) {
			var result = q.compile();

			if(NoPg.debug) {
				debug.log('query = ', result.query);
				debug.log('params = ', result.params);
			}

			return do_query(self, result.query, result.params ).then(get_results(result.ObjType, {
				'fieldMap': result.fieldMap
			}));
		});
	});
}

/** Returns the keyword name without first letter */
var parse_keyword_name = require('./parse_keyword_name.js');

/** Internal INSERT query */
function prepare_insert_query(self, ObjType, data) {
	return nr_fcall("nopg:prepare_insert_query", function() {
		return new InsertQuery({'ObjType': ObjType, 'data':data});
	});
}

/** Internal INSERT query */
function do_insert(self, ObjType, data) {
	return nr_fcall("nopg:do_insert", function() {
		return prepare_insert_query(self, ObjType, data).then(function(q) {
			var result = q.compile();
			return do_query(self, result.query, result.params);
		});
	});
}

/** Compare two variables as JSON strings */
function json_cmp(a, b) {
	a = JSON.stringify(a);
	b = JSON.stringify(b);
	var ret = (a === b) ? true : false;
	return ret;
}

/** Internal UPDATE query */
function do_update(self, ObjType, obj, orig_data) {
	return nr_fcall("nopg:do_update", function() {
		var query, params, data, where = {};

		if(obj.$id) {
			where.$id = obj.$id;
		} else if(obj.$name) {
			where.$name = obj.$name;
		} else {
			throw new TypeError("Cannot know what to update!");
		}

		if(orig_data === undefined) {
			// FIXME: Check that `obj` is an ORM object
			data = obj.valueOf();
		} else {
			data = (new ObjType(obj)).update(orig_data).valueOf();
		}

		// Select only keys that start with $
		var keys = ARRAY(ObjType.meta.keys)
			// Remove leading '$' character from keys
			.filter(first_letter_is_dollar)
			.map( parse_keyword_name )
			// Ignore keys that aren't going to be changed
			.filter(function(key) {
				return data[key];
			// Ignore keys that were not changed
			}).filter(function(key) {
				return json_cmp(data[key], obj['$'+key]) ? false : true;
			});

		// Return with the current object if there is no keys to update
		if(keys.valueOf().length === 0) {
			return do_select(self, ObjType, where);
		}

		// FIXME: Implement binary content support
		query = "UPDATE " + (ObjType.meta.table) + " SET "+ keys.map(function(k, i) { return k + ' = $' + (i+1); }).join(', ') +" WHERE ";

		if(where.$id) {
			query += "id = $"+ (keys.valueOf().length+1);
		} else if(where.$name) {
			query += "name = $"+ (keys.valueOf().length+1);
		} else {
			throw new TypeError("Cannot know what to update!");
		}

		query += " RETURNING *";

		params = keys.map(function(key) {
			return data[key];
		}).valueOf();

		if(where.$id) {
			params.push(where.$id);
		} else if(where.$name){
			params.push(where.$name);
		}

		return do_query(self, query, params);
	});
}

/** Internal DELETE query */
function do_delete(self, ObjType, obj) {
	return nr_fcall("nopg:do_delete", function() {
		if(!(obj && obj.$id)) { throw new TypeError("opts.$id invalid: " + util.inspect(obj) ); }
		var query, params;
		query = "DELETE FROM " + (ObjType.meta.table) + " WHERE id = $1";
		params = [obj.$id];
		return do_query(self, query, params);
	});
}

/**
 * Returns `true` if PostgreSQL database table exists.
 * @todo Implement this in nor-pg and use here.
 */
function pg_table_exists(self, name) {
	return do_query(self, 'SELECT * FROM information_schema.tables WHERE table_name = $1 LIMIT 1', [name]).then(function(rows) {
		if(!rows) { throw new TypeError("Unexpected result from query: " + util.inspect(rows)); }
		return rows.length !== 0;
	});
}

/**
 * Returns `true` if PostgreSQL database relation exists.
 * @todo Implement this in nor-pg and use here.
 */
function pg_relation_exists(self, name) {
	return do_query(self, 'SELECT * FROM pg_class WHERE relname = $1 LIMIT 1', [name]).then(function(rows) {
		if(!rows) { throw new TypeError("Unexpected result from query: " + util.inspect(rows)); }
		return rows.length !== 0;
	});
}

/**
 * Returns `true` if PostgreSQL database table has index like this one.
 * @todo Implement this in nor-pg and use here.
 */
function pg_get_indexdef(self, name) {
	return do_query(self, 'SELECT indexdef FROM pg_indexes WHERE indexname = $1 LIMIT 1', [name]).then(function(rows) {
		if(!rows) { throw new TypeError("Unexpected result from query: " + util.inspect(rows)); }
		if(rows.length === 0) {
			throw new TypeError("Index does not exist!");
		}
		return (rows.shift()||{}).indexdef;
	});
}

/** Convert special characters in field name to "_" for index naming */
function pg_convert_index_name(field) {
	return field.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** Internal DROP INDEX query */
function pg_drop_index(self, ObjType, type, field) {
	return nr_fcall("nopg:pg_drop_index", function() {
		//var pgcast = parse_predicate_pgcast(ObjType, type, field);
		var colname = _parse_predicate_key(ObjType, {'epoch':false}, field);
		var datakey = colname.getMeta('datakey');
		var field_name = (datakey ? datakey + '.' : '' ) + colname.getMeta('key');
		var name = pg_convert_index_name(ObjType.meta.table) + "_" + pg_convert_index_name(field_name) + "_index";
		var query = "DROP INDEX IF EXISTS "+name;
		//query = Query.numerifyPlaceHolders(query);
		//var params = colname.getParams();
		//debug.log("params = ", params);
		return do_query(self, query);
	});
}

/** Internal CREATE INDEX query */
function pg_create_index(self, ObjType, type, field) {
	return nr_fcall("nopg:pg_create_index", function() {
		var pgcast = parse_predicate_pgcast(ObjType, type, field);
		var colname = _parse_predicate_key(ObjType, {'epoch':false}, field);
		var datakey = colname.getMeta('datakey');
		var field_name = (datakey ? datakey + '.' : '' ) + colname.getMeta('key');
		var name = pg_convert_index_name(ObjType.meta.table) + "_" + pg_convert_index_name(field_name) + "_index";
		var query = "CREATE INDEX "+name+" ON " + (ObjType.meta.table) + " USING btree (("+ pgcast(colname.getString()) + "))";
		query = Query.numerifyPlaceHolders(query);
		var params = colname.getParams();
		//debug.log("params = ", params);
		return do_query(self, query, params).then(function verify_index_was_created_correctly(res) {
			// Check that the index was created correctly
			return pg_get_indexdef(self, name).then(function(indexdef) {
				if(indexdef !== query) {
					debug.log('attempted to use: ', query, '\n',
					          '.but created as: ', indexdef);
					throw new TypeError("Failed to create index correctly!");
				}
				return res;
			});
		});
	});
}

/** Returns the CREATE INDEX query */
function pg_create_index_query(self, ObjType, type, field) {
	var pgcast = parse_predicate_pgcast(ObjType, type, field);
	var colname = _parse_predicate_key(ObjType, {'epoch':false}, field);
	var datakey = colname.getMeta('datakey');
	var field_name = (datakey ? datakey + '.' : '' ) + colname.getMeta('key');
	var name = pg_convert_index_name(ObjType.meta.table) + "_" + pg_convert_index_name(field_name) + "_index";
	var query = "CREATE INDEX "+name+" ON " + (ObjType.meta.table) + " USING btree (("+ pgcast(colname.getString()) + "))";
	//query = Query.numerifyPlaceHolders(query);
	var params = colname.getParams();
	if(params.length !== 0) {
		throw new TypeError("pg_create_index_query() does not support params!");
	}
	return query;
}

/** Internal CREATE INDEX query that will create the index only if the relation does not exists already */
function pg_declare_index(self, ObjType, type, field) {
	var colname = _parse_predicate_key(ObjType, {'epoch':false}, field);
	var datakey = colname.getMeta('datakey');
	var field_name = (datakey ? datakey + '.' : '' ) + colname.getMeta('key');
	var name = pg_convert_index_name(ObjType.meta.table) + "_" + pg_convert_index_name(field_name) + "_index";
	return pg_relation_exists(self, name).then(function(exists) {
		if(!exists) {
			return pg_create_index(self, ObjType, type, field);
		}

		return pg_get_indexdef(self, name).then(function(old_indexdef) {
			var new_indexdef = pg_create_index_query(self, ObjType, type, field);
			if(new_indexdef === old_indexdef) {
				return self;
			}

			if(NoPg.debug) {
				debug.info('Rebuilding index...');
				debug.log('old index is: ', old_indexdef);
				debug.log('new index is: ', new_indexdef);
			}

			return pg_drop_index(self, ObjType, type, field).then(function() {
				return pg_create_index(self, ObjType, type, field);
			});
		});
	});
}

/* ------------- PUBLIC FUNCTIONS --------------- */

/** Returns the NoPg constructor type of `doc`, otherwise returns undefined. */
NoPg._getObjectType = function(doc) {
	if(doc instanceof NoPg.Document  ) { return NoPg.Document;   }
	if(doc instanceof NoPg.Type      ) { return NoPg.Type;       }
	if(doc instanceof NoPg.Attachment) { return NoPg.Attachment; }
	if(doc instanceof NoPg.Lib       ) { return NoPg.Lib;        }
	if(doc instanceof NoPg.DBVersion ) { return NoPg.DBVersion;  }
};

/** Returns the NoPg constructor type of `doc`, otherwise throws an exception of `TypeError`. */
NoPg.getObjectType = function(doc) {
	var ObjType = NoPg._getObjectType(doc);
	if(!ObjType) {
		throw new TypeError("doc is unknown type: " + doc);
	}
	return ObjType;
};

/** Record internal timing statistic object */
NoPg.prototype._record_sample = function(data) {
	var self = this;

	var stats_enabled = is.array(self._stats);
	var log_times = process.env.DEBUG_NOPG_EVENT_TIMES !== undefined;

	if( (!stats_enabled) && (!log_times) ) {
		return;
	}

	debug.assert(data).is('object');
	debug.assert(data.event).is('string');
	debug.assert(data.start).is('date');
	debug.assert(data.end).is('date');
	debug.assert(data.duration).ignore(undefined).is('number');
	debug.assert(data.query).ignore(undefined).is('string');
	debug.assert(data.params).ignore(undefined).is('array');

	if(data.duration === undefined) {
		data.duration = _get_ms(data.start, data.end);
	}

	if(stats_enabled) {
		self._stats.push(data);
	}

	if(log_times) {
		_log_time(data);
	}
};

/** Record internal timing statistic object */
NoPg.prototype._finish_samples = function() {
	var self = this;

	var stats_enabled = is.array(self._stats);
	var log_times = process.env.NOPG_EVENT_TIMES !== undefined;

	if( (!stats_enabled) && (!log_times) ) {
		return;
	}

	var start = self._stats[0];
	var end = self._stats[self._stats.length-1];

	debug.assert(start).is('object');
	debug.assert(start.event).is('string').equals('start');

	debug.assert(end).is('object');
	debug.assert(end.event).is('string');

	var server_duration = 0;
	ARRAY(self._stats).forEach(function(sample) {
		server_duration += sample.duration;
	});

	self._record_sample({
		'event': 'transaction',
		'start': start.start,
		'end': end.end
	});

	self._record_sample({
		'event': 'transaction:server',
		'start': start.start,
		'end': end.end,
		'duration': server_duration
	});

};

/** Run query `SET $key = $value` on the PostgreSQL server */
function pg_query(query, params) {
	return function(db) {
		var start_time = new Date();
		return do_query(db, query, params).then(function() {

			var end_time = new Date();

			db._record_sample({
				'event': 'query',
				'start': start_time,
				'end': end_time,
				'query': query,
				'params': params
			});

			return db;
		});
	};
}

/** Create watchdog timer */
function create_watchdog(db, opts) {
	debug.assert(db).is('object');

	opts = opts || {};

	debug.assert(opts).is('object');

	opts.timeout = opts.timeout || 30000;
	debug.assert(opts.timeout).is('number');

	var w = {};
	w.db = db;
	w.opts = opts;

	/* Setup */

	w.timeout = setTimeout(function() {

		var tr_open, tr_commit, tr_rollback, state, tr_unknown;

		debug.warn('Got timeout.');

		// NoPg instance
		if(w.db === undefined) {
			debug.warn("Timeout exceeded and database instance undefined. Nothing done.");
		} else if(w.db && w.db._tr_state) {
			state = w.db._tr_state;
			tr_open = (state === 'open') ? true : false;
			tr_commit = (state === 'commit') ? true : false;
			tr_rollback = (state === 'rollback') ? true : false;
			tr_unknown = ((!tr_open) && (!tr_commit) && (!tr_rollback)) ? true : false;

			if(tr_unknown) {
				debug.warn("Timeout exceeded and transaction state was unknown ("+state+"). Nothing done.");
			} else if(tr_open) {
				debug.warn("Timeout exceeded and transaction still open. Closing it by rollback.");
				w.db.rollback().fail(function(err) {
					debug.error("Rollback failed: " + (err.stack || err) );
				}).done();
			} else {
				if(tr_commit) {
					debug.log('...but commit was already done.');
				}
				if(tr_rollback) {
					debug.log('...but rollback was already done.');
				}
			}

		} else {
			debug.warn("Timeout exceeded but db was not NoPg instance.");
		}

		w.timeout = undefined;
	}, opts.timeout);

	/* Set object */
	w.reset = function(o) {
		debug.assert(o).is('object');
		//debug.log('Resetting the watchdog.');
		w.db = o;
	};

	/** Clear the timeout */
	w.clear = function() {
		if(w.timeout) {
			//debug.log('Clearing the watchdog.');
			clearTimeout(w.timeout);
			w.timeout = undefined;
		}
	};

	return w;
}

/* Defaults */
NoPg.defaults = {};

NoPg.defaults.timeout = 30000;

if(process.env.NOPG_TIMEOUT !== undefined) {
	NoPg.defaults.timeout = parseInt(process.env.NOPG_TIMEOUT, 10) || NoPg.defaults.timeout;
}

/** Start */
NoPg.start = function(pgconfig, opts) {
	return extend.promise( [NoPg], nr_fcall("nopg:start", function() {
		opts = opts || {};
		debug.assert(opts).is('object');
		if(opts.timeout) {
			debug.assert(opts.timeout).is('number');
		}
		var w;
		var start_time = new Date();
		return pg.start(pgconfig).then(function(db) {
			var end_time = new Date();

			if(!db) { throw new TypeError("invalid db: " + util.inspect(db) ); }
			w = create_watchdog(db, {"timeout": opts.timeout || NoPg.defaults.timeout});
			var nopg_db = new NoPg(db);

			nopg_db._record_sample({
				'event': 'start',
				'start': start_time,
				'end': end_time
			});

			return nopg_db;
		}).then(function(db) {
			w.reset(db);
			db._watchdog = w;
			return pg_query("SET plv8.start_proc = 'plv8_init'")(db);
		}).then(function(db) {
			return pg_table_exists(db, NoPg.DBVersion.meta.table).then(function(exists) {
				if(!exists) {
					debug.warn('Detected uninitialized database.');
				}
				return db;
			});
		});
	}));
};

/** Fetch next value from queue */
NoPg.prototype.fetch = function() {
	return this._values.shift();
};

/** Assume the next value in the queue is an array with single value, and throws an exception if it has more than one value.
 * @throws an error if the value is not an array or it has two or more values
 * @returns The first value in the array or otherwise `undefined`
 */
NoPg.prototype.fetchSingle = function() {
	var db = this;
	var items = db.fetch();
	debug.assert(items).is('array').maxLength(1);
	return items.shift();
};

/** Assume the next value in the queue is an array with single value, and prints an warning if it has more than one value.
 * @throws an error if the value is not an array
 * @returns The first value in the array or otherwise `undefined`
 */
NoPg.prototype.fetchFirst = function() {
	var db = this;
	var items = db.fetch();
	debug.assert(items).is('array');
	if(items.length >= 2) {
		debug.warn('nopg.fetchSingle() got an array with too many results (' + items.length + ')');
	}
	return items.shift();
};

/** Push `value` to the queue. It makes it possible to implement your own functions. */
NoPg.prototype.push = function(value) {
	this._values.push(value);
	return this;
};

/** Returns the latest value in the queue but does not remove it */
NoPg.prototype._getLastValue = function() {
	return this._values[this._values.length - 1];
};

/** Commit transaction */
NoPg.prototype.commit = function() {
	var self = this;
	var start_time = new Date();
	return extend.promise( [NoPg], nr_fcall("nopg:commit", function() {
		return self._db.commit().then(function() {
			var end_time = new Date();
			self._record_sample({
				'event': 'commit',
				'start': start_time,
				'end': end_time
			});

			self._finish_samples();

			self._tr_state = 'commit';
			if(is.obj(self._watchdog)) {
				self._watchdog.clear();
			}
			return self;
		});
	}));
};

/** Rollback transaction */
NoPg.prototype.rollback = function() {
	var self = this;
	var start_time = new Date();
	return extend.promise( [NoPg], nr_fcall("nopg:rollback", function() {
		return self._db.rollback().then(function() {
			var end_time = new Date();
			self._record_sample({
				'event': 'rollback',
				'start': start_time,
				'end': end_time
			});

			self._finish_samples();

			self._tr_state = 'rollback';
			if(is.obj(self._watchdog)) {
				self._watchdog.clear();
			}
			return self;
		});
	}) );
};

/** Checks if server has compatible version */
NoPg.prototype.testServerVersion = function() {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:testServerVersion", function() {
		return do_query(self, 'show server_version_num').then(function(rows) {
			//debug.log('PostgreSQL server version (before parse): ', rows);
			var num = rows.shift().server_version_num;
			num = parseInt(num, 10);
			//debug.log('PostgreSQL server version: ', num);
			if(num >= 90300) {
				return self;
			} else {
				throw new TypeError("PostgreSQL server must be v9.3 or newer (detected "+ num +")");
			}
		});
	}));
};

/** Checks if server has compatible version */
NoPg.prototype.testExtension = function(name) {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:testExtension", function() {
		return do_query(self, 'SELECT COUNT(*) AS count FROM pg_catalog.pg_extension WHERE extname = $1', [name]).then(function(rows) {
			var row = rows.shift();
			var count = parseInt(row.count, 10);
			if(count === 1) {
				return self;
			} else {
				throw new TypeError("PostgreSQL server does not have extension: " + name);
			}
		});
	}));
};

/** Tests if the server is compatible */
NoPg.prototype.test = function() {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:test", function() {
		return self.testServerVersion().testExtension('plv8').testExtension('uuid-ossp').testExtension('moddatetime').testExtension('tcn');
	}));
};

/** Returns a number padded to specific width */
function pad(num, size) {
	var s = num+"";
	while (s.length < size) {
		s = "0" + s;
	}
	return s;
}

/** Runs `require(file)` and push results to `builders` array */
function push_file(builders, file) {
	FUNCTION(builders.push).apply(builders, require(file) );
}

/** Initialize the database */
NoPg.prototype.init = function() {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:init", function() {

		return self.test().latestDBVersion().then(function(db) {
			var code_version = require('./schema/latest.js');
			var db_version = db.fetch();
			if(! ((db_version >= -1) && (db_version<=code_version)) ) {
				throw new TypeError("Database version " + db_version + " is not between accepted range (-1 .. " + code_version + ")");
			}
			var builders = [];

			var i = db_version, file;
			while(i < code_version) {
				i += 1;
				file = './schema/v' + pad(i, 4) + '.js';
				try {
					//debug.log('Loading database version ', i, " from ", file);
					//FUNCTION(builders.push).apply(builders, require(file) );
					push_file(builders, file);
				} catch(err) {
					//debug.log("Exception: ", err);
					throw new TypeError("Failed to load: "+ file + ": " + err);
				}
			}

			// Skip upgrade if we have nothing to do
			if(builders.length === 0) {
				return self;
			}

			// Call upgrade steps
			return ARRAY(builders).reduce(function(so_far, f) {
				return so_far.then(function(db) {
					db.fetchAll();
					return db;
				}).then(f);
			}, $Q(self._db)).then(function() {
				return db._addDBVersion({'$version': code_version});
			}).then(function() {
				//debug.log('Successfully upgraded database from v' + db_version + ' to v' + code_version); 
				return self;
			});

		}).then(function() {
			return self._importLib( require.resolve('tv4') ).then(function() { return self; });
		}).then(pg_query("SET plv8.start_proc = 'plv8_init'"));

	}));
};

/** Create document by type: `db.create([TYPE])([OPT(S)])`. */
NoPg.prototype.create = function(type) {
	var self = this;

	function create2(data) {
		return extend.promise( [NoPg], nr_fcall("nopg:create", function() {

			if(type && (type instanceof NoPg.Type)) {
				data.$types_id = type.$id;
				data.$type = type.$name;
			} else if(type) {
				return self._getType(type).then(function(t) {
					if(!(t instanceof NoPg.Type)) {
						throw new TypeError("invalid type received: " + util.inspect(t) );
					}
					type = t;
					return create2(data);
				});
			}

			return do_insert(self, NoPg.Document, data).then(_get_result(NoPg.Document)).then(save_result_to(self));
		}));
	}

	return create2;
};

/** Add new DBVersion record */
NoPg.prototype._addDBVersion = function(data) {
	var self = this;
	return do_insert(self, NoPg.DBVersion, data).then(_get_result(NoPg.DBVersion));
};

/** Search documents */
NoPg.prototype.search = function(type) {
	var self = this;
	var ObjType = NoPg.Document;
	function search2(opts, traits) {
		return extend.promise( [NoPg], nr_fcall("nopg:search", function() {
			return do_select(self, [ObjType, type], opts, traits).then(save_result_to_queue(self)).then(function() { return self; });
		}));
	}
	return search2;
};

/** Search single document */
NoPg.prototype.searchSingle = function(type) {
	var self = this;
	var ObjType = NoPg.Document;
	function searchSingle2(opts, traits) {
		return extend.promise( [NoPg], nr_fcall("nopg:search", function() {
			return do_select(self, [ObjType, type], opts, traits)
				.then(_get_result(ObjType))
				.then(save_result_to_queue(self))
				.then(function() { return self; });
		}));
	}
	return searchSingle2;
};

/** Update document */
NoPg.prototype.update = function(obj, data) {
	var self = this;
	var ObjType = NoPg.getObjectType(obj);
	return extend.promise( [NoPg], nr_fcall("nopg:update", function() {
		return do_update(self, ObjType, obj, data).then(_get_result(ObjType)).then(save_result_to(self));
	}));
};

/** Delete resource */
NoPg.prototype.del = function(obj) {
	if(!obj.$id) { throw new TypeError("opts.$id invalid: " + util.inspect(obj) ); }
	var self = this;
	var ObjType = NoPg.getObjectType(obj);
	return extend.promise( [NoPg], nr_fcall("nopg:del", function() {
		return do_delete(self, ObjType, obj).then(function() { return self; });
	}));
};

NoPg.prototype['delete'] = NoPg.prototype.del;

/** Create a new type. We recommend using `.declareType()` instead unless you want an error if the type exists already. Use like `db.createType([TYPE-NAME])([OPT(S)])`. */
NoPg.prototype.createType = function(name) {
	var self = this;
	function createType2(data) {
		return extend.promise( [NoPg], nr_fcall("nopg:createType", function() {
			data = data || {};
			if(name !== undefined) {
				data.$name = ''+name;
			}
			return do_insert(self, NoPg.Type, data).then(_get_result(NoPg.Type)).then(save_result_to(self));
		}));
	}
	return createType2;
};

/** Create a new type or replace existing type with the new values. Use like `db.declareType([TYPE-NAME])([OPT(S)])`. */
NoPg.prototype.declareType = function(name, opts) {
	opts = opts || {};
	debug.assert(opts).is('object');
	var opts_declare_indexes = opts.hasOwnProperty('declareIndexes') ? (opts.declareIndexes === true) : true;
	var self = this;
	function declareType2(data) {
		return extend.promise( [NoPg], nr_fcall("nopg:declareType", function() {
			data = data || {};

			debug.assert(data).is('object');
			debug.assert(data.indexes).ignore(undefined).is('array');

			var where = {};
			if(name !== undefined) {
				if(name instanceof NoPg.Type) {
					where.$types_id = name.$id;
				} else {
					where.$name = ''+name;
				}
			}

			return self._getType(where).then(function(type) {
				if(type) {
					return self.update(type, data);
				} else {
					return self.createType(name)(data);
				}
			}).then(function declare_indexes() {

				if(!opts_declare_indexes) {
					return self;
				}

				if(is.undef(data.indexes)) {
					return self;
				}

				var type = self.fetch();

				return data.indexes.map(function build_step(index) {
					return function step() {
						return pg_declare_index(self, NoPg.Document, type, index);
					};
				}).reduce($Q.when, $Q()).then(function() {
					return self.push(type);
				});
			});
		}));
	}
	return declareType2;
};

/** Create a new type or replace existing type with the new values. Use like `db.declareType([TYPE-NAME])([OPT(S)])`. */
NoPg.prototype.declareIndexes = function(name) {
	var self = this;
	function declareIndexes2(data) {
		return extend.promise( [NoPg], nr_fcall("nopg:declareIndexes", function() {
			data = data || {};
			debug.assert(data).is('object');
			debug.assert(data.indexes).ignore(undefined).is('array');

			if(is.undef(data.indexes)) {
				return self;
			}

			var where = {};
			if(name !== undefined) {
				if(name instanceof NoPg.Type) {
					where.$types_id = name.$id;
				} else {
					where.$name = ''+name;
				}
			}

			return self._getType(where).then(function(type) {
				return data.indexes.map(function build_step(index) {
					return function step() {
						return pg_declare_index(self, NoPg.Document, type, index);
					};
				}).reduce($Q.when, $Q()).then(function() {
					return self;
				});
			});
		}));
	}
	return declareIndexes2;
};

/** This is an alias for `.declareType()`. */
NoPg.prototype.createOrReplaceType = function(name) {
	return this.declareType(name);
};

/** Tests if type exists */
NoPg.prototype._typeExists = function(name) {
	var self = this;
	if(is.string(name) && self._cache.types.hasOwnProperty(name)) {
		return true;
	}
	return do_select(self, NoPg.Type, name).then(function(types) {
		return (types.length >= 1) ? true : false;
	});
};

/** Tests if lib exists */
NoPg.prototype._libExists = function(name) {
	var self = this;
	return do_select(self, NoPg.Lib, name).then(function(types) {
		return (types.length >= 1) ? true : false;
	});
};

/** Get type and save it to result queue. */
NoPg.prototype.typeExists = function(name) {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:typeExists", function() {
		return self._typeExists(name).then(save_result_to(self));
	}));
};

/** Get type directly */
NoPg.prototype._getType = function(name, traits) {
	var self = this;
	if(!is.string(name)) {
		return do_select(self, NoPg.Type, name, traits).then(_get_result(NoPg.Type));
	}
	if(self._cache.types.hasOwnProperty(name)) {
		return $Q.when(self._cache.types[name]);
	}

	var cached = do_select(self, NoPg.Type, name, traits).then(_get_result(NoPg.Type));
	cached = self._cache.types[name] = cached.then(function(result) {
		if(is.obj(result)) {
			self._cache.types[name] = result;
			if(is.uuid(result.$id)) {
				self._cache.objects[result.$id] = result;
			}
		}
		return result;
	});
	return cached;
};

/** Get type and save it to result queue. */
NoPg.prototype.getType = function(name) {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:getType", function() {
		return self._getType(name).then(save_result_to(self));
	}));
};

/** Alias for `pghelpers.escapeFunction()` */
NoPg._escapeFunction = pghelpers.escapeFunction;

/** Returns the latest database server version */
function _latestDBVersion(self) {
	var table = NoPg.DBVersion.meta.table;
	return pg_table_exists(self, table).then(function(exists) {
		if(!exists) {
			return -1;
		}
		var query = 'SELECT COALESCE(MAX(version), 0) AS version FROM ' + table;
		return do_query(self, query).then(function(rows) {
			if(!(rows instanceof Array)) { throw new TypeError("Unexpected result from rows: " + util.inspect(rows) ); }
			var obj = rows.shift();
			return parseInt(obj.version, 10);
		});
	}).then(function(db_version) {
		if(db_version < -1 ) {
			throw new TypeError("Database version " + db_version + " is not between accepted range (-1 ..)");
		}
		return db_version;
	});
}

/** Returns the latest database server version as a integer number */
NoPg.prototype.latestDBVersion = function() {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:latestDBVersion", function() {
		return _latestDBVersion(self).then(save_result_to(self));
	}));
};

/** Import javascript file into database as a library by calling `.importLib(FILE, [OPT(S)])` or `.importLib(OPT(S))` with `$content` property. */
NoPg.prototype._importLib = function(file, opts) {
	var self = this;
	opts = JSON.parse( JSON.stringify( opts || {} ));

	if( is.obj(file) && (opts === undefined) ) {
		opts = file;
		file = undefined;
	}

	return $Q.fcall(function() {
		if(file) {
			return fs.readFile(file, {'encoding':'utf8'});
		}
		if(opts.$content) {
			return;
		}
		throw new TypeError("NoPg.prototype.importLib() called without content or file");
	}).then(function importLib2(data) {
		opts.$name = opts.$name || require('path').basename(file, '.js');
		var name = '' + opts.$name;

		opts['content-type'] = '' + (opts['content-type'] || 'application/javascript');
		if(data) {
			opts.$content = ''+data;
		}

		return self._libExists(opts.$name).then(function(exists) {
			if(exists) {
				delete opts.$name;
				return do_update(self, NoPg.Lib, {"$name":name}, opts);
			} else {
				return do_insert(self, NoPg.Lib, opts);
			}
		});
	});

};

/** Import javascript file into database as a library by calling `.importLib(FILE, [OPT(S)])` or `.importLib(OPT(S))` with `$content` property. */
NoPg.prototype.importLib = function(file, opts) {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:importLib", function() {
		return self._importLib(file, opts).then(_get_result(NoPg.Lib)).then(save_result_to(self));
	}));
};

/** Get specified object directly */
NoPg.prototype._getObject = function(ObjType) {
	var self = this;
	return function(opts, traits) {
		return do_select(self, ObjType, opts, traits).then(_get_result(ObjType));
	};
};

/** Get document directly */
NoPg.prototype._getDocument = function(opts) {
	var self = this;
	return self._getObject(NoPg.Document)(opts);
};

/** Get document and save it to result queue. */
NoPg.prototype.getDocument = function(opts) {
	var self = this;
	return extend.promise( [NoPg], nr_fcall("nopg:getDocument", function() {
		return self._getDocument(opts).then(save_result_to(self));
	}));
};

/** Search types */
NoPg.prototype.searchTypes = function(opts, traits) {
	var self = this;
	var ObjType = NoPg.Type;
	return extend.promise( [NoPg], nr_fcall("nopg:searchTypes", function() {
		return do_select(self, ObjType, opts, traits).then(save_result_to_queue(self)).then(function() { return self; });
	}));
};

/** Create an attachment from a file in the filesystem.
 * @param obj {object} The document object where the attachment will be placed.
 *          If it is an attachment object, it's parent will be used. If it is 
 *          undefined, then last object in the queue will be used.
 */
NoPg.prototype.createAttachment = function(doc) {
	var self = this;
	var doc_id;

	function createAttachment2(file, opts) {
		return extend.promise( [NoPg], nr_fcall("nopg:createAttachment", function() {
			return $Q.fcall(function() {
				opts = opts || {};

				var file_is_buffer = false;

				try {
					if(file && is.string(file)) {
						debug.assert(file).is('string');
					} else {
						debug.assert(file).typeOf('object').instanceOf(Buffer);
						file_is_buffer = true;
					}
				} catch(e) {
					throw new TypeError("Argument not String or Buffer: " + e);
				}
				debug.assert(opts).is('object');

				if(doc === undefined) {
					doc = self._getLastValue();
				}

				if(doc && (doc instanceof NoPg.Document)) {
					doc_id = doc.$id;
				} else if(doc && (doc instanceof NoPg.Attachment)) {
					doc_id = doc.$documents_id;
				} else {
					throw new TypeError("Could not detect document ID!");
				}

				debug.assert(doc_id).is('string');

				if(file_is_buffer) {
					return file;
				}

				return fs.readFile(file, {'encoding':'hex'});

			}).then(function(buffer) {

				var data = {
					$documents_id: doc_id,
					$content: '\\x' + buffer,
					$meta: opts
				};

				debug.assert(data.$documents_id).is('string');

				return do_insert(self, NoPg.Attachment, data).then(_get_result(NoPg.Attachment)).then(save_result_to(self));
			}); // q_fcall
		})); // nr_fcall
	}
	return createAttachment2;
};

/** Search attachments */
NoPg.prototype.searchAttachments = function(doc) {
	var self = this;

	function get_documents_id(item) {
		if(item instanceof NoPg.Document) {
			return item.$id;
		} else if(item instanceof NoPg.Attachment) {
			return item.$documents_id;
		} else if(item && item.$documents_id) {
			return item.$documents_id;
		} else if(item && item.$id) {
			return item.$id;
		} else {
			return item;
		}
	}

	function searchAttachments2(opts, traits) {
		return extend.promise( [NoPg], nr_fcall("nopg:searchAttachments", function() {

			var ObjType = NoPg.Attachment;
			opts = opts || {};

			if(doc === undefined) {
				doc = self._getLastValue();
			}

			if(is.array(doc)) {
				opts = ARRAY(doc).map(get_documents_id).map(function(id) {
					if(is.uuid(id)) {
						return {'$documents_id': id};
					} else {
						return id;
					}
				}).valueOf();
			} else if(is.obj(doc)) {
				if(!is.obj(opts)) {
					opts = {};
				}
				opts.$documents_id = get_documents_id(doc);
			}

			return do_select(self, ObjType, opts, traits).then(save_result_to_queue(self)).then(function() { return self; });
		}));
	}

	return searchAttachments2;
};

/** Get value of internal PG connection */
NoPg.prototype.valueOf = function nopg_prototype_valueof() {
	return this._db;
};

/* EOF */
