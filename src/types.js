/** Our NoPg types */

"use strict";

var $Q = require("q");
var util = require("util");
var NoPg = require("./nopg.js");
var debug = require("nor-debug");
var ARRAY = require('nor-array');

function build_type_step(type, opts) {
	return function build_type_step_(db) {
		return db.declareType(type, {
			'declareIndexes': false
		})(opts);
	};
}

function build_index_step(pg_config, type, opts) {
	return function build_index_step_() {
		return $Q(NoPg.start(pg_config).declareIndexes(type)(opts).commit());
	};
}

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
	}).then(function declare_types(db) {
		return ARRAY(Object.keys(types)).map(function(key) {
			return build_type_step(key, types[key]);
		}).reduce($Q.when, $Q(db));
	}).fail(function(err) {
		//debug.log("Types promise failed: ", err);
		if(!_db) {
			return $Q.reject(err);
		}
		return _db.rollback().then(function() {
			_db = undefined;
		}).fail(function(err) {
			debug.error("Database rollback failed: ", err);
		}).fin(function() {
			return $Q.reject(err);
		});
	}).then(function(db) {
		return db.commit();
	}).then(function declare_indexes(db) {
		return ARRAY(Object.keys(types)).map(function(key) {
			return build_index_step(pg_config, key, types[key]);
		}).reduce($Q.when, $Q()).then(function() {
			return db;
		});
	}).then(function(db) {
		var types = {}, type;
		do {
			type = db.fetch();
			if(type) {
				types[type.$name] = type;
			}
		} while(type);
		return types;
	});

	return types_promise;
};

/* EOF*/
