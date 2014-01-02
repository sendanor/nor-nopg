/* nor-nopg */

var debug = require('nor-debug');
var util = require('util');
var Q = require('q');
var pg = require('nor-pg');
var extend = require('nor-extend').setup({useFunctionPromises:true});
var orm = require('./orm');

/* ------------- PUBLIC FUNCTIONS --------------- */


/** The constructor */
function NoPg(db) {
	var self = this;
	if(!db) { throw new TypeError("db invalid: " + util.inspect(db) ); }
	self._db = db;
	self._values = [];
	self._tr_state = 'open';
}

module.exports = NoPg;

// Object constructors
NoPg.Document = orm.Document;
NoPg.Type = orm.Type;
NoPg.Attachment = orm.Attachment;
NoPg.Lib = orm.Lib;

/** Returns the NoPg constructor type of `doc`, otherwise throws an exception of `TypeError`. */
NoPg.getObjectType = function(doc) {
	if(doc instanceof NoPg.Document) {
		return NoPg.Document;
	} else if(doc instanceof NoPg.Type) {
		return NoPg.Type;
	} else if(doc instanceof NoPg.Attachment) {
		return NoPg.Attachment;
	} else if(doc instanceof NoPg.Lib) {
		return NoPg.Lib;
	}
	throw new TypeError("doc is unknown type: " + doc);
};

/** Start */
NoPg.start = function(pgconfig) {
	return extend.promise( [NoPg], pg.start(pgconfig).then(function(db) {
		if(!db) { throw new TypeError("invalid db: " + util.inspect(db) ); }
		return new NoPg(db);
	}));
};

/** Fetch next value from queue */
NoPg.prototype.fetch = function() {
	return this._values.shift();
};

/** Commit transaction */
NoPg.prototype.commit = function() {
	var self = this;
	return extend.promise( [NoPg], this._db.commit().then(function() {
		self._tr_state = 'commit';
		return self;
	}) );
};

/** Rollback transaction */
NoPg.prototype.rollback = function() {
	var self = this;
	return extend.promise( [NoPg], this._db.rollback().then(function() {
		self._tr_state = 'rollback';
		return self;
	}) );
};

/** Checks if server has compatible version */
NoPg.prototype.testServerVersion = function() {
	var self = this;
	return do_query.call(self, 'show server_version_num').then(function(rows) {
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
NoPg.prototype.testExtension = function(name) {
	var self = this;
	return do_query.call(self, 'SELECT COUNT(*) AS count FROM pg_catalog.pg_extension WHERE extname = $1', [name]).then(function(rows) {
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
NoPg.prototype.test = function() {
	return this.testServerVersion().testExtension('plv8').testExtension('uuid-ossp').testExtension('moddatetime').testExtension('tcn');
};

/** Initialize the database */
NoPg.prototype.init = function() {
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

/** Create document by type: `db.create([TYPE])([OPT(S)])`. */
NoPg.prototype.create = function(type) {
	debug.log('at NoPg::create(', type, ')');
	var self = this;

	function create2(data) {
		debug.log('at NoPg::create2(', data, ')');

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

		return do_insert.call(self, NoPg.Document, data).then(get_result(NoPg.Document)).then(save_result_to(self));
	}

	return create2;
};

/** Search documents */
NoPg.prototype.search = function(type) {
	debug.log('at search(', type, ')');
	var self = this;

	function search2(opts) {
		debug.log('at search2(', opts, ')');

		var query, keys, params, ObjType, dbtype;

		ObjType = NoPg.Document;

		debug.log('opts = ', opts);
		var parsed_opts = parse_predicates(ObjType)(opts, ObjType.meta.datakey.substr(1) );
		debug.log('parsed_opts = ', parsed_opts);

		keys = Object.keys(parsed_opts);
		debug.log('keys = ', keys);

		params = keys.map(function(key) { return parsed_opts[key]; });
		debug.log('params = ', params);

		var where = keys.map(function(k,n) { return k + ' = $' + (n+1); });
		debug.log('where = ', where);

		if(type !== undefined) {
			if(typeof type === 'string') {
				where.push("types_id = get_type($"+(where.length+1)+")");
				params.push(type);
			} else if(type instanceof NoPg.Type) {
				where.push("types_id = $" + (where.length+1));
				params.push(type.$id);
			} else {
				throw new TypeError("Unknown type: " + type);
			}
			debug.log('where = ', where, ' after types_id');
			debug.log('params = ', params, ' after types_id');
		}

		query = "SELECT * FROM "+(ObjType.meta.table);

		if(where.length >= 1) {
			query += " WHERE " + where.join(' AND ');
		}

		debug.log('query = ' + query);

		return do_query.call(self, query, params).then(get_results(ObjType)).then(save_result_to_queue(self)).then(function() { return self; });
	}

	return search2;
};

/** Update document */
NoPg.prototype.update = function(obj, data) {
	var self = this;
	var ObjType = NoPg.getObjectType(obj);
	return do_update.call(self, ObjType, obj, data).then(get_result(ObjType)).then(save_result_to(self));

	/*
	var query, params, type;
	//assert_type(doc, NoPg.Document, "doc is not NoPg.Document");
	if(data === undefined) {
		data = doc.valueOf();
	}
	if(doc instanceof NoPg.Document) {
		type = NoPg.Document;
		query = "UPDATE " + (NoPg.Document.meta.table) + " SET content = $1 WHERE id = $2 RETURNING *";
		params = [data, doc.$id];
	} else if(doc instanceof NoPg.Type) {
		type = NoPg.Type;
		query = "UPDATE " + (NoPg.Type.meta.table) + " SET name = $1, schema = $2, validator = $3, meta = $4 WHERE id = $5 RETURNING *";
		params = [doc.$name, doc.$schema, doc.$validator, data, doc.$id];
	} else if(doc instanceof NoPg.Attachment) {
		type = NoPg.Attachment;
		query = "UPDATE " + (NoPg.Attachment.meta.table) + " SET content = $1, meta = $2 WHERE id = $3 RETURNING *";
		// FIXME: Implement binary content support
		params = [doc.$content, data, doc.$id];
	} else if(doc instanceof NoPg.Lib) {
		type = NoPg.Lib;
		query = "UPDATE " + (NoPg.Lib.meta.table) + " SET name = $1, content = $2, meta = $3 WHERE id = $4 RETURNING *";
		// FIXME: Implement binary content support
		params = [doc.$name, doc.$content, data, doc.$id];
	} else {
		throw new TypeError("doc is unknown type: " + doc);
	}
	return do_query.call(self, query, params).then(get_result(type)).then(save_result_to(doc)).then(function() { return self; });
	*/
};

/** Delete resource */
NoPg.prototype.del = function(doc) {
	var self = this;
	var query, params;
	var ObjType = NoPg.getObjectType(doc);
	query = "DELETE FROM " + (ObjType.meta.table) + " WHERE id = $1";
	params = [doc.$id];
	return do_query.call(self, query, params).then(function() { return self; });
};

NoPg.prototype['delete'] = NoPg.prototype.del;

/** Create type: `db.createType([TYPE-NAME])([OPT(S)])`. */
NoPg.prototype.createType = function(name) {
	debug.log('at createType(', name, ')');
	var self = this;
	function createType2(data) {
		data = data || {};
		debug.log('at createType2(', data, ')');
		if(name !== undefined) {
			data.$name = ''+name;
		}
		return do_insert.call(self, NoPg.Type, data).then(get_result(NoPg.Type)).then(save_result_to(self));
	}
	return createType2;
};

/** Create type: `db.createType([TYPE-NAME])([OPT(S)])`. */
NoPg.prototype.createOrReplaceType = function(name) {
	debug.log('at createOrReplaceType(', name, ')');
	var self = this;
	function createOrReplaceType2(data) {
		data = data || {};
		debug.log('at createOrReplaceType2(', data, ')');
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
		});
	}
	return createOrReplaceType2;
};

/** Tests if type exists */
NoPg.prototype._typeExists = function(name) {
	debug.log('at NoPg::_typeExists(', name, ')');
	var self = this;
	return do_select.call(self, NoPg.Type, name).then(function(types) {
		return (types.length >= 1) ? true : false;
	});
};

/** Get type and save it to result queue. */
NoPg.prototype.typeExists = function(name) {
	debug.log('at NoPg::typeExists(', name, ')');
	var self = this;
	return self._typeExists(name).then(save_result_to(self));
};

/** Get type directly */
NoPg.prototype._getType = function(name) {
	debug.log('at NoPg::_getType(', name, ')');
	var self = this;
	return do_select.call(self, NoPg.Type, name).then(get_result(NoPg.Type));
};

/** Get type and save it to result queue. */
NoPg.prototype.getType = function(name) {
	debug.log('at NoPg::getType(', name, ')');
	var self = this;
	return self._getType(name).then(save_result_to(self));
};



/* ------------- HELPER FUNCTIONS --------------- */


/** */
function assert(valid, text) {
	if(!valid) {
		throw new TypeError(text);
	}
}

/** Assert that the `doc` is NoPg.Document */
function assert_type(doc, type, text) {
	assert(doc instanceof type, text || "Not correct type: " + type);
}

/** Take first result from the database query and returns new instance of `Type` */
function get_result(Type) {
	return function(rows) {
		if(!rows) { throw new TypeError("failed to parse result"); }
		var doc = rows.shift();
		if(!doc) { return; }
		var obj = {};
		Object.keys(doc).forEach(function(key) {
			obj['$'+key] = doc[key];
		});
		return new Type(obj);
	};
}

/** Take all results from the database query and return an array of new instances of `Type` */
function get_results(Type) {
	return function(rows) {
		return rows.map(function(row, i) {
			if(!row) { throw new TypeError("failed to parse result #" + i + " in an array"); }
			var obj = {};
			Object.keys(row).forEach(function(key) {
				obj['$'+key] = row[key];
			});
			return new Type(obj);
		});
	};
}

/** Takes the result and saves it into `self`. If `self` is one of `NoPg.Document`, 
 * `NoPg.Type`, `NoPg.Attachment` or `NoPg.Lib`, then the content is updated into 
 * that instance. If the `doc` is an instance of `NoPg` then the result can be 
 * fetched using `self.fetch()`.
 */
function save_result_to(self) {
	if( (self instanceof NoPg.Document)
	 || (self instanceof NoPg.Type)
	 || (self instanceof NoPg.Attachment)
	 || (self instanceof NoPg.Lib)
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

/** Convert properties like {"$foo":123} -> "foo = 123" and {foo:123} -> "(meta->'foo')::numeric = 123" and {foo:"123"} -> "meta->'foo' = '123'"
 * Usage: `var where = parse_predicates(NoPg.Document)({"$foo":123})`
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


/* ------------- PRIVATE FUNCTIONS --------------- */


/** Perform generic query */
function do_query(query, values) {
	var self = this;
	if(!self) { throw new TypeError("do_query() invalid: self: " + util.inspect(self)); }
	if(!self._db) { throw new TypeError("do_query() invalid: self._db: " + util.inspect(self._db)); }
	if(!query) { throw new TypeError("do_query() invalid: query: " + util.inspect(query)); }
	return extend.promise( [NoPg], self._db._query(query, values) );
}

/** Generic SELECT query */
function do_select(ObjType, opts) {
	debug.log('at do_select(self, ObjType, opts=', opts, ')');
	var self = this;
	var query, keys, params;
	var where = {};

	if(opts instanceof NoPg.Type) {
		where.id = opts.$id;
	} else if(typeof opts === 'object') {
		Object.keys(opts).filter(function(key) {
			return key[0] === '$' ? true : false;
		}).forEach(function(key) {
			where[key.substr(1)] = opts[key];
		});
	} else {
		where.name = ''+opts;
	}

	keys = Object.keys(where);

	query = "SELECT * FROM " + (ObjType.meta.table) + " WHERE " + keys.map(function(key, i) { return key + ' = $' + (i+1); }).join(' AND ');
	debug.log('query = ', query);

	params = keys.map(function(key) {
		return where[key];
	});
	debug.log('params = ', params);

	return do_query.call(self, query, params);
}

/** Internal INSERT query */
function do_insert(ObjType, data) {
	var self = this;
	debug.log('at NoPg::do_insert(ObjType=', ObjType, ", data=", data, ')');

	data = (new ObjType(data)).valueOf();
	debug.log("at NoPg::do_insert: after parsing, data = ", data);

	var query, params;

	// Filter only $-keys which are not the datakey
	var keys = ObjType.meta.keys.filter(function(key) {
		return (key[0] === '$') ? true : false;
	}).map(function(key) {
		return key.substr(1);
	}).filter(function(key) {
		return data[key] ? true : false;
	});

	if(keys.length === 0) { throw new TypeError("No data to submit: keys array is empty."); }

	query = "INSERT INTO " + (ObjType.meta.table) + " ("+ keys.join(', ') +") VALUES ("+ keys.map(function(k, i) { return '$' + (i+1); }).join(', ') +") RETURNING *";
	debug.log('at NoPg::do_insert: query = ', query);

	params = keys.map(function(key) {
		return data[key];
	});
	debug.log('at NoPg::do_insert: params = ', params);

	return do_query.call(self, query, params); //.then(get_result(ObjType)).then(save_result_to(self));
}


/** Internal UPDATE query */
function do_update(ObjType, obj, data) {
	debug.log('at NoPg::do_update(ObjType=', ObjType,'obj=', obj, ", data=", data, ')');

	var self = this;
	data = (new ObjType(data)).valueOf();
	debug.log("at NoPg::do_update: after parsing, data = ", data);

	var query, params;
	if(data === undefined) {
		data = obj.valueOf();
	}

	// Filter only $-keys which are not the datakey
	var keys = ObjType.meta.keys.filter(function(key) {
		return (key[0] === '$') ? true : false;
	}).map(function(key) {
		return key.substr(1);
	}).filter(function(key) {
		return data[key] ? true : false;
	});

	if(keys.length === 0) { throw new TypeError("No data to submit: keys array is empty."); }

	// FIXME: Implement binary content support

	query = "UPDATE " + (ObjType.meta.table) + " SET "+ keys.map(function(k, i) { return k + ' = $' + (i+1); }).join(', ') +" WHERE id = $"+ (keys.length+1) +" RETURNING *";
	debug.log('at NoPg::do_update: query = ', query);

	params = keys.map(function(key) {
		return data[key];
	});
	params.push(obj.$id);
	debug.log('at NoPg::do_update: params = ', params);

	return do_query.call(self, query, params);
}


/* EOF */
