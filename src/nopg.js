/* nor-nopg */

var pg = require('nor-pg');
var extend = require('nor-extend');
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

/** Get object handler */
function get_object(rows) {
	var doc = rows.shift();
	if(!doc) { throw new TypeError("failed to parse object"); }
	var obj = {};
	Object.keys(doc).forEach(function(key) {
		obj['$'+key] = doc[key];
	});
	return new NoPgObject(obj);
}

/** Save object handler */
function save_object_to(self) {
	if(self instanceof NoPgObject) {
		return function(doc) {
			return self.update(doc);
		};
	}

	if(self._values) {
		return function(doc) {
			self._values.push( doc );
			return self;
		};
	}

	throw new TypeError("Unknown target");
}

/** Perform query */
function do_query(self, query, values) {
	return extend.promise( [NoPG], self._db._query(query, values) );
}

/** Commit transaction */
NoPG.prototype.commit = function() {
	return extend.promise( [NoPG], this._db.commit() );
};

/** Create object */
NoPG.prototype.create = function(data) {
	var self = this;
	return do_query(self, "INSERT INTO objects (content) VALUES ($1) RETURNING *", [data]).then(get_object).then(save_object_to(self));
};

/** Update object */
NoPG.prototype.update = function(doc, data) {
	var self = this;
	assert_type(doc, NoPgObject, "doc is not NoPg.Object");
	return do_query(self, "UPDATE objects SET content = $1 RETURNING *", [data]).then(get_object).then(save_object_to(doc));
};

/* EOF */
