/* nor-nopg -- NoPg.Attachment object implementation */
"use strict";

var debug = require('nor-debug');
var util = require("util");
//var events = require("events");
var NoPgORM = require("./ORM.js");

var meta = require('./meta.js')({
	"table": "attachments",
	"datakey": '$meta',
	"keys": ['$id', '$documents_id', '$content', '$meta', '$created', '$modified']
});

/** The constructor */
function NoPgAttachment(opts) {
	var self = this;
	opts = opts || {};
	NoPgORM.call(this);
	meta(self).set_meta_keys(opts).resolve();
}

util.inherits(NoPgAttachment, NoPgORM);

/* Universal typing information */
NoPgAttachment.prototype.nopg = function() {
	return {
		'orm_type': 'Attachment'
	};
};

/** Get internal database object */
NoPgAttachment.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

NoPgAttachment.meta = meta;

module.exports = NoPgAttachment;

/** Update changes to current instance */
NoPgAttachment.prototype.update = function(data) {
	var self = this;
	//debug.log("NoPg.Attachment.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/** Returns the $content as Buffer instance */
NoPgAttachment.prototype.getBuffer = function() {
	var self = this;

	// If we already got instance of Buffer, we don't need to do anything.
	if( self.$content && (typeof self.$content === 'object') && (self.$content instanceof Buffer)) {
		return self.$content;
	}

	debug.assert(self.$content).is('array');
	return new Buffer( self.$content );

};

/* EOF */
