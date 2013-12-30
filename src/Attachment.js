/* nor-nopg -- Attachment object implementation */

var meta = require('./meta.js')({
	"datakey": '$meta',
	"keys": ['$id', '$objects_id', '$content', '$meta']
});

/** The constructor */
function Attachment(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

/** Get internal database object */
Attachment.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

Attachment.meta = meta;

module.exports = Attachment;

/* EOF */
