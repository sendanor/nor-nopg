/* nor-nopg -- NoPg.Lib implementation */

var meta = require('./meta.js')({
	"table": "libs",
	"datakey": '$meta',
	"keys": ['$id', '$name', '$content', '$meta', '$created', '$updated']
});

/** The constructor */
function NoPgLib(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

NoPgLib.meta = meta;

/** Get internal database object */
NoPgLib.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = NoPgLib;

/* EOF */
