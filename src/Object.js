/* nor-nopg -- NoPgObject object implementation */

var debug = require('nor-debug');

var meta = require('./meta.js')({
	"datakey": '$content',
	"keys":['$id', '$content', '$types_id']
});

/** The constructor */
function NoPgObject(opts) {
	var self = this;
	var opts = opts || {};

	debug.log("NoPgObject(opts = ", opts, ")");

	meta(self).set_meta_keys(opts).resolve();
}

NoPgObject.meta = meta;

module.exports = NoPgObject;

/** Get internal database object */
NoPgObject.prototype.valueOf = function() {
	var self = this;
	return meta(self).unresolve();
};

/** Update changes to current instance */
NoPgObject.prototype.update = function(data) {
	var self = this;
	debug.log("NoPgObject.prototype.update(data = ", data, ")");
	// FIXME: If values are removed from the database, local copy properties are NOT removed currently!
	meta(self).set_meta_keys(data).resolve();
	return self;
};

/* EOF */
