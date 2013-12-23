/* nor-nopg -- Attachment object implementation */

var debug = require('nor-debug');

function meta(opts) {
	opts = opts || {};
	var keys = opts.keys || [];

	function builder(self) {
		var obj = {};

		/** Set meta keys */
		obj.set_meta_keys = function(data) {
			keys.forEach(function(key) {
				if(data[key] !== undefined) {
					self[key] = data[key];
				}
			});
			debug.log("object after set_meta_keys(", data, ") is: ", self);
		};
	
		/** Resolve single object key into top level */
		obj.resolve = function(metakey) {
			metakey = metakey || '$meta';
			if(self[metakey]) {
				Object.keys(self[metakey]).forEach(function(key) {
					self[key] = self[metakey][key];
				});
				debug.log("object after resolve(", metakey, ") is: ", self);
			}
		};

		return obj;
	}
	
	/** Internal meta keys */
	builder.keys = keys;

	return builder;
}

module.exports = meta;

/* EOF */
