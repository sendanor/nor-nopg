/* nor-nopg -- NoPgObject object implementation */

var debug = require('nor-debug');

var meta = require('./meta.js')({
	"keys":['$id', '$content', '$types_id']
});

/** The constructor */
function NoPgObject(opts) {
	var self = this;
	var opts = opts || {};

	debug.log("NoPgObject(opts = ", opts, ")");

	meta(self).set_meta_keys(opts);
	meta(self).resolve('$content');
}

NoPgObject.metaKeys = meta.keys;

module.exports = NoPgObject;

/** Update changes to current instance */
NoPgObject.prototype.update = function(data) {
	var self = this;
	debug.log("NoPgObject.prototype.update(data = ", data, ")");
	meta(self).set_meta_keys(data);
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).resolve('$content');
	return self;
};

/* EOF */
