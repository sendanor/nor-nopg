/* nor-nopg -- NoPg.Attachment object implementation */

var debug = require('nor-debug');

var meta = require('./meta.js')({
	"table": "attachments",
	"datakey": '$meta',
	"keys": ['$id', '$documents_id', '$content', '$meta', '$created', '$updated']
});

/** The constructor */
function NoPgAttachment(opts) {
	var self = this;
	opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

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
	
	// Not the most efficient but hopefully works for now. Got from https://github.com/brianc/node-postgres/issues/37
	var val = '' + self.$content;
	return new Buffer(val.replace(/\\([0-7]{3})/g, function (full_match, code) {
		return String.fromCharCode(parseInt(code, 8));
	}).replace(/\\\\/g, "\\"), "binary");

};

/* EOF */
