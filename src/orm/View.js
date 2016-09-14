/* nor-nopg -- NoPg.View implementation */
"use strict";

//var debug = require('nor-debug');
var util = require("util");
//var events = require("events");
var NoPgORM = require("./ORM.js");

var meta = require('./meta.js')({
	"table": "views",
	"datakey": '$meta',
	"keys": ['$id', '$types_id', '$name', '$type', '$meta', '$active', '$created', '$modified']
});

/** The constructor */
function NoPgView(opts) {
	var self = this;
	opts = opts || {};
	NoPgORM.call(self);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgView, NoPgORM);

NoPgView.meta = meta;

/* Universal typing information */
NoPgView.prototype.nopg = function() {
	return {
		'orm_type': 'View'
	};
};

/** Get internal database object */
NoPgView.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = NoPgView;

/** Update changes to current instance */
NoPgView.prototype.update = function(data) {
	var self = this;
	//debug.log("NoPg.View.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/* EOF */
