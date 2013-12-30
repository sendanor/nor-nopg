/* nor-nopg -- Type object implementation */

var meta = require('./meta.js')({
	"datakey": '$meta',
	"keys": ['$id', '$name', '$schema', '$validator', '$meta']
});

/** The constructor */
function Type(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

/** Get internal database object */
Type.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

Type.meta = meta;

module.exports = Type;

/* EOF */
