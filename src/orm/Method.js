/* nor-nopg -- NoPg.Method implementation */
"use strict";

//var debug = require('nor-debug');
var util = require("util");
//var events = require("events");
var NoPgORM = require("./ORM.js");

var meta = require('./meta.js')({
	"table": "methods",
	"datakey": '$meta',
	"keys": ['$id', '$types_id', '$name', '$type', '$body', '$meta', '$active', '$created', '$modified']
});

/** The constructor */
function NoPgMethod(opts) {
	var self = this;
	opts = opts || {};
	NoPgORM.call(self);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgMethod, NoPgORM);

NoPgMethod.meta = meta;

/* Universal typing information */
NoPgMethod.prototype.nopg = function() {
	return {
		'orm_type': 'Method'
	};
};

/** Get internal database object */
NoPgMethod.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = NoPgMethod;

/** Update changes to current instance */
NoPgMethod.prototype.update = function(data) {
	var self = this;
	//debug.log("NoPg.Method.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/* EOF */
