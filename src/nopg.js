/* nor-nopg */

var pg = require('nor-pg');
var extend = require('nor-extend');

/** The constructor */
function NoPG(db) {
	var self = this;
	self._db = db;
	self._values = [];
}

module.exports = NoPG;

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

/** Get document handler */
function get_document(rows) {
	var doc = rows.shift();
	if(!doc) { throw new TypeError("failed to parse document"); }
	return doc;
}

/** Save document handler */
function save_document_to(self) {
	return function(doc) {
		self._values.push( doc );
		return self;
	};
}

/** Perform query */
function do_query(self, query, values) {
	return extend.promise( [NoPG], self._db._query(query, values) );
}

/** Commit transaction */
NoPG.prototype.commit = function() {
	return extend.promise( [NoPG], this._db.commit() );
};

/** Create document */
NoPG.prototype.create = function(data) {
	var self = this;
	return do_query(self, "INSERT INTO objects (content) VALUES ($1) RETURNING *", [data]).then(get_document).then(save_document_to(self));
};

/* EOF */
