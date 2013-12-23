/* nor-nopg -- Attachment object implementation */

var meta = require('./meta.js')({
	"keys": ['$id', '$objects_id', '$content', '$meta']
});

/** The constructor */
function Attachment(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts);
	meta(self).resolve();
}

Attachment.metaKeys = meta.keys;

module.exports = Attachment;

/* EOF */
