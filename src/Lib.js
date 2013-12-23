/* nor-nopg -- Lib object implementation */

var meta = require('./meta.js')({
	"keys": ['$id', '$name', '$content', '$meta']
});

/** The constructor */
function Lib(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts);
	meta(self).resolve();
}

Lib.metaKeys = meta.keys;

module.exports = Lib;

/* EOF */
