/**
 * nor-nopg -- NoSQL database library for PostgreSQL
 * Copyright 2014 Sendanor <info@sendanor.fi>,
 *           2014 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

"use strict";

var debug = require('nor-debug');
var ARRAY = require('nor-array');

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

/* ------- (OPTIONAL) NEWRELIC SUPPORT ---------- */

var nr_fcall = require('nor-newrelic/src/fcall.js');

/* ------------- HELPER FUNCTIONS --------------- */

/** Returns seconds between two date values
 * @returns {number} Time between two values (ms)
 */
function get_ms(a, b) {
	debug.assert(a).is('date');
	debug.assert(b).is('date');
	if(a < b) {
		return b.getTime() - a.getTime();
	}
	return a.getTime() - b.getTime();
}

/** Optionally log time */
function log_time(sample) {

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

module.exports = NoPg;

NoPg.debug = (process.env.DEBUG_NOPG ? true : false);

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

/** */
/*
function assert(valid, text) {
	if(!valid) {
		throw new TypeError(text);
	}
}
*/

/** Assert that the `obj` is NoPg.Document */
/*
function assert_type(obj, type, text) {
	assert(obj instanceof type, text || "Not correct type: " + type);
}
*/

/** Take first result from the database query and returns new instance of `Type` */
function get_result(Type) {
	return function(rows) {
		if(!rows) { throw new TypeError("failed to parse result"); }
		var doc = rows.shift();
		if(!doc) { return; }

		if(doc instanceof Type) {
			return doc;
		}

		var obj = {};
		ARRAY(Object.keys(doc)).forEach(function(key) {
			obj['$'+key] = doc[key];
		});
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

			if(row instanceof Type) {
				return row;
			}

			var obj = {};
			ARRAY(Object.keys(row)).forEach(function(key) {
				parse_field(obj, key, row[key]);
			});

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

/** Returns PostgreSQL keyword for NoPg keyword. Converts `$foo` to `foo` and `foo` to `meta->'foo'` etc.  */
function parse_predicate_key(Type, key, opts) {
	opts = opts || {};
	var as = opts.as ? true : false;
	if( is.func(opts.as) ) {
		as = opts.as;
	} else if(as) {
		as = function(a, b) {
			return '' + a + '__' + b.replace(/[^a-zA-Z0-9\_\-\.]/g, '_');
		};
	}

	var datakey = get_predicate_datakey(Type);

	function parse_meta_key(datakey, key) {

		/*jslint regexp: false*/
		var keyreg = /^[^']+$/;
		/*jslint regexp: true*/

		// FIXME: Implement escape?
		if(!(keyreg.test(key))) { throw new TypeError("Invalid keyword: " + key); }

		if(is.func(as)) {
			return "json_extract_path("+datakey+", '"+key+"') AS " + as(datakey, key);
		}

		//return ""+datakey+"->>'"+key+"'";
		return "json_extract_path("+datakey+", '"+key+"')";
	}

	function parse_top_key(key) {

		// $type is a special keyword for string-based $types_id for Documents
		// FIXME: This probably should be implemented somewhere else (like inside Document)
		if( (Type === NoPg.Document) && (key === '$type') ) {
			if(as) {
				return "get_type(types_id)->>'name' AS type";
			} else {
				return "get_type(types_id)->>'name'";
			}
		}

		//if(key === '$*') {
		//	return "*, get_type(types_id)->>'name' AS type";
		//}

		if(is.func(as)) {
			return ""+key.substr(1);
		}

		if(key === '$created') {
			return "to_json(extract(epoch from created)*1000)";
		}

		if(key === '$updated') {
			return "to_json(extract(epoch from updated)*1000)";
		}

		return key.substr(1);
	}

	// Huh, next line is implemented in a funny way. Not sure if it's even faster/better. Not even less bytes. :-)
	return ( (key[0] === '$') ? parse_top_key : parse_meta_key.bind(undefined, datakey) ) (key);
}

/** Returns true if first letter is dollar */
function first_letter_is_dollar(k) {
	return k[0] === '$';
}

/** @FIXME Implement escape? */
function is_valid_key(key) {
	var keyreg = /^[a-zA-Z0-9_\-\.]+$/;
	return keyreg.test(key);
}

/** Convert properties like {"$foo":123} -> "foo = 123" and {foo:123} -> "(meta->'foo')::numeric = 123" and {foo:"123"} -> "meta->'foo' = '123'"
 * Usage: `var where = parse_predicates(NoPg.Document)({"$foo":123})`
 */
function parse_predicates(Type) {

	//function first_letter_not_dollar(k) {
	//	return k[0] !== '$';
	//}

	/** */
	function parse_keyref(datakey, key) {
		if(key.indexOf('.') === -1) {
			return "" + datakey + "->>'" + key + "'";
		} else {
			return "" + datakey + "#>>'{" + key.split('.').join(',') +"}'";
		}
	}

	function parse_meta_properties(res, opts, datakey, key) {
		if(!is_valid_key(key)) { throw new TypeError("Invalid keyword: " + key); }
		var keyref = parse_keyref(datakey, key);
		if(is.boolean(opts[key])) {
			res["("+keyref+")::boolean IS TRUE"] = (opts[key] === true) ? 'true' : 'false';
		} else if(is.number(opts[key])) {
			res["("+keyref+")::numeric"] = opts[key];
		} else {
			res[keyref] = ''+opts[key];
		}
	}

	function parse_top_level_properties(res, opts, key) {
		var k = key.substr(1);
		res[k] = opts[key];
	}

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
function get_type_condition(params, type) {
	if(type !== undefined) {
		if(is.string(type)) {
			params.push(type);
			return "types_id = get_type_id($"+(params.length)+")";
		} else if(type instanceof NoPg.Type) {
			params.push(type.$id);
			return "types_id = $" + (params.length);
		} else {
			throw new TypeError("Unknown type: " + util.inspect(type));
		}
	}
}

/** Returns true if `i` is not `undefined` */
function not_undefined(i) {
	return i !== undefined;
}

/** Parse array predicate */
function parse_function_predicate(ObjType, arg_params, def_op, o) {
	debug.assert(o).is('array');

	var keys, func, params, i;

	// FIXME: This loop could be optimized to return directly once first function is found! #performance
	func = ARRAY(o).filter(is.func).valueOf().shift();

	debug.assert(func).is('function');

	i = o.indexOf(func);
	debug.assert(i).is('number');

	keys = o.slice(0, i);
	params = o.slice(i+1);

	debug.assert(keys).is('array');
	debug.assert(params).is('array');

	//debug.log('keys = ', keys);
	//debug.log('func = ', func);
	//debug.log('params = ', params);

	var parsed_keys = ARRAY(keys).map(parse_predicate_key.bind(undefined, ObjType)).valueOf();

	//debug.log('parsed_keys = ', parsed_keys);
	debug.assert(parsed_keys).is('array');

	var n = arg_params.length;

	arg_params.push(JSON.stringify(require('./fun.js').toString(func)));
	arg_params.push(JSON.stringify(params));

	return '(nopg.call_func(array_to_json(ARRAY['+parsed_keys.join(', ')+']), $'+(n+1)+'::json, $'+(n+2)+"::json)::text = 'true')";

}

/* This object is because these functions need each other at the same time and must be defined before use. */
var _parsers = {};

/** Parse array predicate */
_parsers.parse_array_predicate = function parse_array_predicate(ObjType, params, def_op, o) {

	var op = 'AND';
	if( (o[0] === 'AND') || (o[0] === 'OR') || (o[0] === 'BIND') ) {
		o = [].concat(o);
		op = o.shift();
	}

	if(op === 'BIND') {
		return parse_function_predicate(ObjType, params, def_op, o);
	}

	return '(' + ARRAY(o).map(_parsers.recursive_parse_predicates.bind(undefined, ObjType, params, def_op)).filter(not_undefined).join(') '+op+' (') + ')';
};

/** Recursively parse predicates */
_parsers.recursive_parse_predicates = function recursive_parse_predicates(ObjType, params, def_op, o) {

	if(o === undefined) { return; }

	if( is.array(o) ) {
		return _parsers.parse_array_predicate(ObjType, params, def_op, o);
	}

	if( is.obj(o) ) {
		o = parse_predicates(ObjType)(o, ObjType.meta.datakey.substr(1) );
		return '(' + ARRAY(Object.keys(o)).map(function(k) {
			params.push(o[k]);
			return '' + k + ' = $' + params.length;
		}).join(') '+def_op+' (') + ')';
	}

	return ''+o;
};

// Exports as normal functions
var recursive_parse_predicates = _parsers.recursive_parse_predicates.bind();
//var parse_array_predicate = _parsers.parse_array_predicate.bind();

/** Parse traits object */
function parse_search_traits(traits) {
	traits = traits || {};

	/* Parse `traits.fields` */
	if(!traits.fields) {
		traits.fields = ['$*'];
	}

	if(!is.array(traits.fields)) {
		traits.fields = [traits.fields];
	}

	debug.assert(traits.fields).is('array');

	/* Parse `traits.order` */

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

	return traits;
}

/** Parses internal fields from nopg style fields */
function parse_internal_fields(ObjType, nopg_fields) {
	debug.assert(ObjType).is('function');
	debug.assert(nopg_fields).is('array');

	var field_id = 0;
	var field_map = {};

	function field_as(a, b) {
		field_id += 1;
		var key;
		if(!b) {
			key = a;
			field_map[key] = a;
			return key;
		} else {
			key = a + '__' + field_id;
			field_map[key] = [a, b];
			return key;
		}
	}

	// Append $type if it is not there and $* has been included
	var nopg_fields_ = ARRAY(nopg_fields);
	if((ObjType === NoPg.Document) && nopg_fields_.some(function(f) { return f === '$*'; }) &&
	   nopg_fields_.every(function(f) { return f !== '$type'; }) ) {
		nopg_fields.push('$type');
	}

	//
	var fields = nopg_fields_.map(function(f) {
		return parse_predicate_key(ObjType, f, {as: field_as});
	}).valueOf();

	var result = {
		"keys": fields,
		"map": field_map
	};

	return result;
}

/** Parse opts object */
function parse_search_opts(opts, traits) {

	if(opts === undefined) {
	} else if(is.array(opts)) {
		if( (opts.length >= 1) && is.obj(opts[0]) ) {
			opts = [ ((traits.match === 'any') ? 'OR' : 'AND') ].concat(opts);
		}
	} else if(opts instanceof NoPg.Type) {
		opts = [ "AND", { "$id": opts.$id } ];
	} else if(is.obj(opts)) {
		opts = [ ((traits.match === 'any') ? 'OR' : 'AND') , opts];
	} else {
		opts = [ "AND", {"$name": ''+opts} ];
	}

	return opts;
}

/** Returns PostgreSQL type for key based on the schema
 * @FIXME Detect correct types for all keys
 */
function parse_predicate_pgtype(ObjType, document_type, key) {

	debug.assert(ObjType).is('function');
	debug.assert(document_type).is('object');

	var schema = document_type.$schema || {};
	debug.assert(schema).is('object');

	if(key[0] === '$') {

		if(key === '$version') {
			return 'numeric';
		}

		if( (key === '$created') || (key === '$updated') ) {
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
	//debug.log('pgtype = ', pgtype);
	if(pgtype === 'boolean') {
		return 'text::boolean IS TRUE';
	}
	if(pgtype === 'numeric') {
		return 'text::numeric';
	}
	return pgtype;
}

/** Parse `traits.order` */
function parse_traits_order(types, order) {

	debug.assert(types).is('array');
	types = [].concat(types);

	var ObjType = types.shift();
	var document_type = types.shift();

	debug.assert(ObjType).is('function');
	debug.assert(document_type).ignore(undefined).is('object');
	debug.assert(order).is('array');

	return order.map(function(o) {
		var key, rest;
		if(is.array(o)) {
			key = o[0];
			rest = o.slice(1);
		} else {
			key = o;
			rest = [];
		}

		var parsed_key = parse_predicate_key(ObjType, key);
		//debug.log('parsed_key = ', parsed_key);
		var pgcast = document_type ? parse_predicate_pgcast(ObjType, document_type, key) : 'text';
		//debug.log('pgtype = ', pgtype);

		return [ '(' + parsed_key + ')::' + pgcast].concat(rest).join(' ');
	}).join(', ');
}

/** Generic SELECT query */
function do_select(self, types, opts, traits) {
	return nr_fcall("nopg:do_select", function() {

		var _recursive = false;
		if(is.obj(traits) && traits._recursive) {
			_recursive = traits._recursive;
		}

		if( is.array(opts) && (opts.length === 1) && (['OR', 'AND', 'BIND'].indexOf(opts[0]) !== -1) ) {
			throw new TypeError('opts invalid: ' + util.inspect(opts) );
		}

		var ObjType, document_type;
		if(is.array(types)) {
			types = [].concat(types);
			ObjType = types.shift();
			document_type = types.shift();
		} else {
			ObjType = types;
		}

		traits = parse_search_traits(traits);
		opts = parse_search_opts(opts, traits);
		var fields = parse_internal_fields(ObjType, traits.fields);

		/* Build `type_condition` */

		var where = [], params = [];

		var type_condition;
		if(document_type) {
			type_condition = get_type_condition(params, document_type);
			if(type_condition) { where.push( type_condition ); }
		}

		/* Parse `opts_condition` */

		var opts_condition;
		if(opts) {
			opts_condition = recursive_parse_predicates(ObjType, params, ((traits.match === 'any') ? 'OR' : 'AND'), opts);
			where.push( opts_condition );
		}

		debug.assert(where).is('array');

		if(NoPg.debug) {
			debug.log('opts = ', opts);
		} else if(!where.every(function(item) { return is.string(item) && (item.length >= 1); })) {
			debug.warn('search() got unknown input: check debug logs.');
			debug.log('where = ', where);
			debug.log('types = ', types);
			debug.log('traits = ', traits);
			debug.log('opts = ', opts);
		}

		var query = "SELECT " + fields.keys.join(', ') + " FROM " + (ObjType.meta.table);

		if(where.length >= 1) {
			query += " WHERE (" + where.join(') AND (') + ')';
		}

		var document_type_obj;

		if(is.obj(document_type) && (document_type instanceof NoPg.Type) ) {
			document_type_obj = document_type;
		}

		/* */
		function our_query() {

			if(traits.order) {
				query += ' ORDER BY ' + parse_traits_order([ObjType, document_type_obj], traits.order);
			}

			if(traits.limit) {
				query += ' LIMIT ' + traits.limit;
			}

			if(traits.offset) {
				query += ' OFFSET ' + traits.offset;
			}

			return do_query(self, query, params).then(get_results(ObjType, {
				'fieldMap': fields.map
			}));

		}

		if( traits.order && (!document_type_obj) && is.string(document_type) && (!_recursive) ) {
			var type_fields = parse_internal_fields(NoPg.Type, ['$*']);
			return do_query(self, "SELECT * FROM types WHERE name = $1", [document_type]).then(get_results(NoPg.Type, {
				'fieldMap': type_fields.map
			})).then(function(results) {
				debug.assert(results).is('array');
				if(results.length !== 1) {
					if(results.length === 0) {
						throw new TypeError("Database has no type: " + document_type);
					}
					throw new TypeError("Database has multiple types: " + document_type + " (" + results.length + ")");
				}
				var result = results.shift();
				debug.assert(result).is('object');
				document_type_obj = result;
			}).then(our_query);
		}

		return our_query();
	});
}

/** Returns the keyword name without first letter */
function parse_keyword_name(key) {
	return key.substr(1);
}

/** Internal INSERT query */
function do_insert(self, ObjType, data) {
	return nr_fcall("nopg:do_insert", function() {

		data = (new ObjType(data)).valueOf();

		function get_data(key) {
			return data[key];
		}

		// FIXME: These array loops could be joined as one loop. #performance

		// Filter only $-keys which are not the datakey
		var keys = ARRAY(ObjType.meta.keys).filter(first_letter_is_dollar).map(parse_keyword_name).filter(get_data);

		if(keys.valueOf().length === 0) { throw new TypeError("No data to submit: keys array is empty."); }

		var query = "INSERT INTO " + (ObjType.meta.table) +
		      " ("+ keys.join(', ') +
		      ") VALUES (" + keys.map(function(k, i) { return '$' + (i+1); }).join(', ') +
		      ") RETURNING *";

		var params = keys.map(get_data).valueOf();
		return do_query(self, query, params);
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

/** Convert special characters in field name to "_" for index naming */
function pg_convert_index_name(field) {
	return field.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/** Internal CREATE INDEX query */
function pg_create_index(self, ObjType, type, field) {
	return nr_fcall("nopg:pg_create_index", function() {
		var pgcast = parse_predicate_pgcast(ObjType, type, field);
		var colname = parse_predicate_key(ObjType, field);
		var name = pg_convert_index_name(ObjType.meta.table) + "_" + pg_convert_index_name(colname) + "_index";
		var query = "CREATE INDEX "+name+" ON " + (ObjType.meta.table) + " (("+ colname + "::" + pgcast +"))";
		var params = [];
		return do_query(self, query, params);
	});
}

/** Internal CREATE INDEX query that will create the index only if the relation does not exists already */
function pg_declare_index(self, ObjType, type, field) {
	var colname = parse_predicate_key(ObjType, field);
	var name = pg_convert_index_name(ObjType.meta.table) + "_" + pg_convert_index_name(colname) + "_index";
	return pg_relation_exists(self, name).then(function(exists) {
		if(exists) { return; }
		return pg_create_index(self, ObjType, type, field);
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
		data.duration = get_ms(data.start, data.end);
	}

	if(stats_enabled) {
		self._stats.push(data);
	}

	if(log_times) {
		log_time(data);
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

		debug.log('Got timeout.');

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
					debug.log('Warning! Detected uninitialized database.');
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
	debug.assert(items).is('array');
	if(items.length >= 2) {
		debug.assert(items).length(1);
	}
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
		debug.log('Warning! nopg.fetchSingle() got an array with too many results (' + items.length + ')');
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
					builders.push.apply(builders, require(file) );
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
			} else if(type) {
				return self._getType(type).then(function(t) {
					if(!(t instanceof NoPg.Type)) {
						throw new TypeError("invalid type received: " + util.inspect(t) );
					}
					type = t;
					return create2(data);
				});
			}

			return do_insert(self, NoPg.Document, data).then(get_result(NoPg.Document)).then(save_result_to(self));
		}));
	}

	return create2;
};

/** Add new DBVersion record */
NoPg.prototype._addDBVersion = function(data) {
	var self = this;
	return do_insert(self, NoPg.DBVersion, data).then(get_result(NoPg.DBVersion));
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
				.then(get_result(ObjType))
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
		return do_update(self, ObjType, obj, data).then(get_result(ObjType)).then(save_result_to(self));
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
			return do_insert(self, NoPg.Type, data).then(get_result(NoPg.Type)).then(save_result_to(self));
		}));
	}
	return createType2;
};

/** Create a new type or replace existing type with the new values. Use like `db.declareType([TYPE-NAME])([OPT(S)])`. */
NoPg.prototype.declareType = function(name) {
	var self = this;
	function createOrReplaceType2(data) {
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
	return createOrReplaceType2;
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
		return do_select(self, NoPg.Type, name, traits).then(get_result(NoPg.Type));
	}
	if(self._cache.types.hasOwnProperty(name)) {
		return $Q.when(self._cache.types[name]);
	}

	var cached = do_select(self, NoPg.Type, name, traits).then(get_result(NoPg.Type));
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
		return self._importLib(file, opts).then(get_result(NoPg.Lib)).then(save_result_to(self));
	}));
};

/** Get specified object directly */
NoPg.prototype._getObject = function(ObjType) {
	var self = this;
	return function(opts, traits) {
		return do_select(self, ObjType, opts, traits).then(get_result(ObjType));
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

				return do_insert(self, NoPg.Attachment, data).then(get_result(NoPg.Attachment)).then(save_result_to(self));
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
