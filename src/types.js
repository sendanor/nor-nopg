/** Our NoPg types */

"use strict";

var $Q = require("q");
var util = require("util");
var NoPg = require("./nopg.js");
var debug = require("nor-debug");
var ARRAY = require('nor-array');

module.exports = function get_database_types(opts) {
	//debug.log("nopg-types.js: get_database_types(opts=", opts, ")");
	opts = opts || {};

	if(!opts.pg) { throw new TypeError("invalid pg config: " + util.inspect(opts.pg) ); }

	var pg_config = opts.pg, _db;

	var types = opts.types || {};

	//debug.log("nopg-types.js: types = ", types);

	var types_promise = NoPg.start(pg_config).then(function(db) {
		_db = db;
		return _db;
	}).then(function(db) {

		function build_step(type, opts) {
			return function(db) {
				return db.declareType(type)(opts);
			};
		}

		return ARRAY(Object.keys(types)).map(function(key) {
			return build_step(key, types[key]);
		}).reduce(function (soFar, f) {
			return soFar.then(f);
		}, $Q(db));

	}).commit().then(function(db) {
		var types = {}, type;
		do {
			type = db.fetch();
			if(type) {
				types[type.$name] = type;
			}
		} while(type);
		return types;
	}).fail(function(err) {
		//debug.log("Types promise failed: ", err);
		if(_db) {
			_db.rollback().fail(function(err) {
				debug.error("Database rollback failed: " + err);
			}).done();
			_db = undefined;
		}
		throw err;
	});

	return types_promise;
};

/* EOF*/
