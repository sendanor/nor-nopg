/* nor-nopg -- Lib object implementation */

var meta = require('./meta.js')({
	"datakey": '$meta',
	"keys": ['$id', '$name', '$content', '$meta']
});

/** The constructor */
function Lib(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

Lib.meta = meta;

/** Get internal database object */
Lib.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = Lib;

/* EOF */
