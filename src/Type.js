/* nor-nopg -- Type object implementation */

var meta = require('./meta.js')({
	"keys": ['$id', '$name', '$schema', '$validator', '$meta']
});

/** The constructor */
function Type(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts);
	meta(self).resolve();
}

Type.metaKeys = meta.keys;

module.exports = Type;

/* EOF */
