/* nor-nopg -- NoPg.DBVersion implementation */

var meta = require('./meta.js')({
	"table": "dbversion",
	"keys": ['$version', '$updated']
});

/** The constructor */
function NoPgDBVersion(opts) {
	var self = this;
	var opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

NoPgDBVersion.meta = meta;

/** Get internal database object */
NoPgDBVersion.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = NoPgDBVersion;

/* EOF */
