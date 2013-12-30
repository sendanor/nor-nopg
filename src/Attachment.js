/* nor-nopg -- NoPgAttachment object implementation */

var meta = require('./meta.js')({
	"table": "attachments",
	"datakey": '$meta',
	"keys": ['$id', '$objects_id', '$content', '$meta']
});

/** The constructor */
function NoPgAttachment(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

/** Get internal database object */
NoPgAttachment.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

NoPgAttachment.meta = meta;

module.exports = NoPgAttachment;

/* EOF */
