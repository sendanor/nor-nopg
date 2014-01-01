/* nor-nopg -- NoPg.Type implementation */

var meta = require('./meta.js')({
	"table": "types",
	"datakey": '$meta',
	"keys": ['$id', '$name', '$schema', '$validator', '$meta', '$created', '$updated']
});

/** The constructor */
function NoPgType(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

/** Get internal database object */
NoPgType.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

NoPgType.meta = meta;

module.exports = NoPgType;

/* EOF */
