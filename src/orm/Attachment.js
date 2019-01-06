/* nor-nopg -- NoPg.Attachment object implementation */
"use strict";

import is from '@norjs/is';
import debug from '@norjs/debug';
import util from "util";
import NoPgORM from "./ORM.js";

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

	// Workaround
	if( self.$content && (typeof self.$content === 'object') && self.$content.type === 'Buffer' && is.array(self.$content.data)) {
		return new Buffer(self.$content.data);
	}

	debug.assert(self.$content).is('array');
	return new Buffer( self.$content );

};

/* EOF */
