/* nor-nopg -- Lib object implementation */

var _meta_keys = ['$id', '$name', '$content', '$meta'];

/** The constructor */
function Lib(opts) {
	var self = this;
	var opts = opts || {};

	// Set meta keys
	_meta_keys.forEach(function(key) {
		if(opts[key] !== undefined) {
			self[key] = opts[key];
		}
	});

	// Unresolve $meta
	if(self.$meta) {
		Object.keys(self.$meta).forEach(function(key) {
			if(self[key] === undefined) {
				self[key] = self.$meta[key];
			}
		});
	}
}

Lib.metaKeys = _meta_keys;

module.exports = Lib;

/* EOF */
