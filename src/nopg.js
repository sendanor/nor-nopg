/* nor-nopg */

var debug = require('nor-debug');
var Q = require('q');
var pg = require('nor-pg');
var extend = require('nor-extend').setup({useFunctionPromises:true});
var NoPgObject = require('./Object.js');
var NoPgType = require('./Type.js');
var NoPgAttachment = require('./Attachment.js');
var NoPgLib = require('./Lib.js');

/** */
function assert(valid, text) {
	if(!valid) {
		throw new TypeError(text);
	}
}

/** Assert that the `doc` is NoPgObject */
function assert_type(doc, type, text) {
	assert(doc instanceof type, text || "Not correct type: " + type);
}


/** The constructor */
function NoPG(db) {
	var self = this;
	self._db = db;
	self._values = [];
}

module.exports = NoPG;

// Object constructors
NoPG.Object = NoPgObject;

/** Start */
NoPG.start = function(pgconfig) {
	return extend.promise( [NoPG], pg.start(pgconfig).then(function(db) {
		return new NoPG(db);
	}));
};

/** Fetch next value from queue */
NoPG.prototype.fetch = function() {
	return this._values.shift();
};

/** Get handler for objects for Type */
function get_result(Type) {
	return function(rows) {
		var doc = rows.shift();
		if(!doc) { throw new TypeError("failed to parse object"); }
		var obj = {};
		Object.keys(doc).forEach(function(key) {
			obj['$'+key] = doc[key];
		});
		return new Type(obj);
	};
}

/** Get handler for objects for Type */
function get_results(Type) {
	return function(rows) {
		return rows.map(function(row, i) {
			if(!row) { throw new TypeError("failed to parse object #" + i); }
			var obj = {};
			Object.keys(row).forEach(function(key) {
				obj['$'+key] = row[key];
			});
			return new Type(obj);
		});
	};
}

/** Save object handler */
function save_object_to(self) {

	if( (self instanceof NoPgObject)
	 || (self instanceof NoPgType)
	 || (self instanceof NoPgAttachment)
	 || (self instanceof NoPgLib)
	  ) {
		return function(doc) { return self.update(doc); };
	}

	if(self._values) {
		return function(doc) {
			self._values.push( doc );
			return self;
		};
	}

	throw new TypeError("Unknown target: " + (typeof self));
}

/** Save objects handler */
function save_objects_to(self) {

	if(self._values) {
		return function(objs) {
			self._values.push( objs );
			return self;
		};
	}

	throw new TypeError("Unknown target: " + (typeof self));
}

/** Perform query */
function do_query(self, query, values) {
	return extend.promise( [NoPG], self._db._query(query, values) );
}

/** Commit transaction */
NoPG.prototype.commit = function() {
	return extend.promise( [NoPG], this._db.commit() );
};

/** Checks if server has compatible version */
NoPG.prototype.testServerVersion = function() {
	var self = this;
	return do_query(self, 'show server_version_num').then(function(rows) {
		debug.log('PostgreSQL server version (before parse): ', rows);
		var num = rows.shift().server_version_num;
		num = parseInt(num, 10);
		debug.log('PostgreSQL server version: ', num);
		if(num >= 90300) {
			return self;
		} else {
			throw new TypeError("PostgreSQL server must be v9.3 or newer (detected "+ num +")");
		}
	});
};

/** Checks if server has compatible version */
NoPG.prototype.testExtension = function(name) {
	var self = this;
	return do_query(self, 'select COUNT(*) AS count from pg_catalog.pg_extension where extname = $1', [name]).then(function(rows) {
		var row = rows.shift();
		var count = parseInt(row.count, 10);
		debug.log('Count of extensions by ' + name + ': ', count);
		if(count === 1) {
			return self;
		} else {
			throw new TypeError("PostgreSQL server does not have extension: " + name);
		}
	});
};

/** Tests if the server is compatible */
NoPG.prototype.test = function() {
	return this.testServerVersion().testExtension('plv8').testExtension('uuid-ossp').testExtension('moddatetime').testExtension('tcn');
};

/** Initialize the database */
NoPG.prototype.init = function() {
	var self = this;
	return self.test().then(function() {
		var builders = require('./schema/');
		return builders.reduce(function(so_far, f) {
		    return so_far.then(function(db) {
				db.fetchAll();
				return db;
			}).then(f);
		}, Q(self._db)).then(function() { return self; });
	});
};

/** Create object by type: `db.create([TYPE])([OPT(S)])`. */
NoPG.prototype.create = function(type) {
	debug.log('at create(', type, ')');
	var self = this;
	function create2(data) {
		debug.log('at create2(', data, ')');

		var query, params;

		if(type !== undefined) {
			if(typeof type === 'string') {
				query = "INSERT INTO objects (content, types_id) VALUES ($1, get_type($2)) RETURNING *";
				params = [data, type];
			} else if(type instanceof NoPgType) {
				query = "INSERT INTO objects (content, types_id) VALUES ($1, $2) RETURNING *";
				params = [data, type.id];
			} else {
				throw new TypeError("unknown type: " + type);
			}
		} else {
			query = "INSERT INTO objects (content) VALUES ($1) RETURNING *";
			params = [data];
		}

		debug.log('query = ', query);
		debug.log('params = ', params);

		return do_query(self, query, params).then(get_result(NoPgObject)).then(save_object_to(self));
	}
	return create2;
};

/** Convert properties like {"$foo":123} -> "foo = 123" and {foo:123} -> "(meta->'foo')::numeric = 123" and {foo:"123"} -> "meta->'foo' = '123'"
 * Usage: `var where = parse_predicates(NoPgObject)({"$foo":123})`
 */
function parse_predicates(Type) {
	function parse_data(opts) {
		opts = opts || {};
		datakey = (Type.meta.datakey || '$meta').substr(1);
		var res = {};
		
		// Parse meta properties
		Object.keys(opts).filter(function(k) { return k[0] !== '$'; }).forEach(function(key) {
			var keyreg = /^[^']+$/;
			// FIXME: Implement escape?
			if(!(keyreg.test(key))) { throw new TypeError("Invalid keyword: " + key); }
			if(typeof opts[key] === 'number') {
				res["("+datakey+"->'"+key+"')::numeric"] = opts[key];
			} else {
				res[""+datakey+"->>'"+key+"'"] = ''+opts[key];
			}
		});
		
		// Parse top level properties
		Object.keys(opts).filter(function(k) { return k[0] === '$'; }).forEach(function(key) {
			var k = key.substr(1);
			res[k] = opts[key];
		});
	
		return res;
	}
	return parse_data;
}

/** Search objects */
NoPG.prototype.search = function(type) {
	debug.log('at search(', type, ')');
	var self = this;

	function search2(opts) {
		debug.log('at search2(', opts, ')');

		var query, keys, params, Type, table;

		Type = NoPgObject;
		table = "objects";

		debug.log('opts = ' + opts);
		var parsed_opts = parse_predicates(Type)(opts, Type.meta.datakey.substr(1) );
		debug.log('parsed_opts = ' + parsed_opts);

		keys = Object.keys(parsed_opts);
		debug.log('keys = ' + keys);

		params = keys.map(function(key) { return parsed_opts[key]; });
		debug.log('params = ' + params);

		query = "SELECT * FROM "+table+" WHERE " + keys.map(function(k,n) { return k + ' = $' + (n+1); }).join(' AND ');
		debug.log('query = ' + query);

		return do_query(self, query, params).then(get_results(Type)).then(save_objects_to(self)).then(function() { return self; });
	}

	return search2;
};

/** Update object */
NoPG.prototype.update = function(doc, data) {
	var self = this;
	var query, params, type;
	//assert_type(doc, NoPgObject, "doc is not NoPg.Object");
	if(data === undefined) {
		data = doc.valueOf();
	}
	if(doc instanceof NoPgObject) {
		type = NoPgObject;
		query = "UPDATE objects SET content = $1 WHERE id = $2 RETURNING *";
		params = [data, doc.$id];
	} else if(doc instanceof NoPgType) {
		type = NoPgType;
		query = "UPDATE types SET name = $1, schema = $2, validator = $3, meta = $4 WHERE id = $5 RETURNING *";
		params = [doc.$name, doc.$schema, doc.$validator, data, doc.$id];
	} else if(doc instanceof NoPgAttachment) {
		type = NoPgAttachment;
		query = "UPDATE attachments SET content = $1, meta = $2 WHERE id = $3 RETURNING *";
		// FIXME: Implement binary content support
		params = [doc.$content, data, doc.$id];
	} else if(doc instanceof NoPgLib) {
		type = NoPgLib;
		query = "UPDATE libs SET name = $1, content = $2, meta = $3 WHERE id = $4 RETURNING *";
		// FIXME: Implement binary content support
		params = [doc.$name, doc.$content, data, doc.$id];
	} else {
		throw new TypeError("doc is unknown type: " + doc);
	}
	return do_query(self, query, params).then(get_result(type)).then(save_object_to(doc)).then(function() { return self; });
};

/** Delete object */
NoPG.prototype.del = function(doc) {
	var self = this;
	var query, params;
	if(doc instanceof NoPgObject) {
		query = "DELETE FROM objects WHERE id = $1";
		params = [doc.$id];
	} else if(doc instanceof NoPgType) {
		query = "DELETE FROM types WHERE id = $1";
		params = [doc.$id];
	} else if(doc instanceof NoPgAttachment) {
		query = "DELETE FROM attachments WHERE id = $1";
		// FIXME: Implement binary content support
		params = [doc.$id];
	} else if(doc instanceof NoPgLib) {
		query = "DELETE FROM libs WHERE id = $1";
		// FIXME: Implement binary content support
		params = [doc.$id];
	} else {
		throw new TypeError("doc is unknown type: " + doc);
	}
	return do_query(self, query, params).then(function() { return self; });
};

NoPG.prototype['delete'] = NoPG.prototype.del;

/** Create type object by type: `db.createType([TYPE-NAME])([OPT(S)])`. */
NoPG.prototype.createType = function(name) {
	debug.log('at createType(', name, ')');
	var self = this;
	function createType2(opts) {
		opts = opts || {};
		debug.log('at createType2(', opts, ')');
		var schema = opts.schema || {};
		var validator = opts.validator ? (''+opts.validator) : null;
		var meta = opts.meta || {};
		var query = "INSERT INTO types (name, schema, validator, meta) VALUES ($1, $2, $3, $4) RETURNING *";
		var params = [name, schema, validator, meta];
		debug.log('query = ' + query);
		debug.log('params = ' + params);
		return do_query(self, query, params).then(get_result(NoPgType)).then(save_object_to(self));
	}
	return createType2;
};

/* EOF */
