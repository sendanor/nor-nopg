/* nor-nopg -- Document object implementation */

var _meta_keys = ['$id', '$content', '$types_id'];

/** The constructor */
function Document(opts) {
	var self = this;
	var opts = opts || {};

	// Set meta keys
	_meta_keys.forEach(function(key) {
		if(opts[key] !== undefined) {
			self[key] = opts[key];
		}
	});

}

Document.metaKeys = _meta_keys;

module.exports = Document;

/* EOF */
