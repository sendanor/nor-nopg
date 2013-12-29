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

		/** Unresolve object back into internal database data */
		obj.unresolve = function(metakey) {
			metakey = metakey || '$meta';
			var data = {};
			//Object.keys(self).filter(function(key) { return key[0] === '$' ? true : false; }).forEach(function(key) {
			//	data[key] = self[key];
			//});

			Object.keys(self).filter(function(key) { return key[0] !== '$' ? true : false; }).forEach(function(key) {
				//if(self[metakey] === undefined) {
				//	self[metakey] = {};
				//}
				data[key] = self[key];
			});

			return data;
		};

		return obj;
	}
	
	/** Internal meta keys */
	builder.keys = keys;

	return builder;
}

module.exports = meta;

/* EOF */
