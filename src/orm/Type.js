/* nor-nopg -- NoPg.Type implementation */
"use strict";

//var debug = require('nor-debug');
var util = require("util");
//var events = require("events");
var NoPgORM = require("./ORM.js");

var meta = require('./meta.js')({
	"table": "types",
	"datakey": '$meta',
	"keys": ['$id', '$name', '$schema', '$validator', '$meta', '$created', '$updated'],
	"parsers": {
		"$validator": "function"
	}
});

/** The constructor */
function NoPgType(opts) {
	var self = this;
	opts = opts || {};
	NoPgORM.call(this);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgType, NoPgORM);

/* Universal typing information */
NoPgType.prototype.nopg = function() {
	return {
		'orm_type': 'Type'
	};
};

/** Get internal database object */
NoPgType.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

/** Update changes to current instance */
NoPgType.prototype.update = function(data) {
	var self = this;
	//debug.log("NoPg.Type.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

NoPgType.meta = meta;

module.exports = NoPgType;

/* EOF */
