/* nor-nopg -- NoPg.Lib implementation */
"use strict";

//var debug = require('nor-debug');
var util = require("util");
//var events = require("events");
var NoPgORM = require("./ORM.js");

var meta = require('./meta.js')({
	"table": "libs",
	"datakey": '$meta',
	"keys": ['$id', '$name', '$content', '$meta', '$created', '$updated']
});

/** The constructor */
function NoPgLib(opts) {
	var self = this;
	opts = opts || {};
	NoPgORM.call(self);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgLib, NoPgORM);

NoPgLib.meta = meta;

/* Universal typing information */
NoPgLib.prototype.nopg = function() {
	return {
		'orm_type': 'Lib'
	};
};

/** Get internal database object */
NoPgLib.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = NoPgLib;

/** Update changes to current instance */
NoPgLib.prototype.update = function(data) {
	var self = this;
	//debug.log("NoPg.Lib.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/* EOF */
