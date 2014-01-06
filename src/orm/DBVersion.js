/* nor-nopg -- NoPg.DBVersion implementation */

var debug = require('nor-debug');

var meta = require('./meta.js')({
	"table": "dbversions",
	"keys": ['$version', '$updated']
});

/** The constructor */
function NoPgDBVersion(opts) {
	var self = this;
	opts = opts || {};

	meta(self).set_meta_keys(opts).resolve();
}

NoPgDBVersion.meta = meta;

/** Get internal database object */
NoPgDBVersion.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

module.exports = NoPgDBVersion;

/** Update changes to current instance */
NoPgDBVersion.prototype.update = function(data) {
	var self = this;
	debug.log("NoPg.DBVersion.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/* EOF */
