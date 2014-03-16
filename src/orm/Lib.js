/* nor-nopg -- NoPg.Lib implementation */

var debug = require('nor-debug');
var util = require("util");
var events = require("events");

var meta = require('./meta.js')({
	"table": "libs",
	"datakey": '$meta',
	"keys": ['$id', '$name', '$content', '$meta', '$created', '$updated']
});

/** The constructor */
function NoPgLib(opts) {
	var self = this;
	opts = opts || {};
	events.EventEmitter.call(this);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgLib, events.EventEmitter);

NoPgLib.meta = meta;

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
