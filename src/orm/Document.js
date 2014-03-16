/* nor-nopg -- NoPg.Document implementation */

var fs = require('nor-fs');
var debug = require('nor-debug');
var util = require("util");
var events = require("events");

var meta = require('./meta.js')({
	"table": "documents",
	"datakey": '$content',
	"keys":['$id', '$type', '$content', '$types_id', '$created', '$updated']
});

/** The constructor */
function NoPgDocument(opts) {
	var self = this;
	opts = opts || {};
	//debug.log("NoPg.Document(opts = ", opts, ")");
	events.EventEmitter.call(this);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgDocument, events.EventEmitter);

NoPgDocument.meta = meta;

module.exports = NoPgDocument;

/** Get internal database object */
NoPgDocument.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

/** Update changes to current instance */
NoPgDocument.prototype.update = function(data) {
	var self = this;
	//debug.log("NoPg.Document.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/* EOF */
