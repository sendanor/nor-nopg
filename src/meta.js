/* nor-nopg -- Attachment object implementation */

var debug = require('nor-debug');

function meta(opts) {
	opts = opts || {};

	function builder(self) {
		var obj = {};

		/** Set meta keys */
		obj.set_meta_keys = function(data) {
			builder.keys.forEach(function(key) {
				if(data[key] !== undefined) {
					self[key] = data[key];
				}
			});
			debug.log("object after set_meta_keys(", data, ") is: ", self);
			return obj;
		};
		
		/** Resolve single object key into top level */
		obj.resolve = function(datakey) {
			datakey = datakey || builder.datakey;
			if(self[datakey]) {
				Object.keys(self[datakey]).forEach(function(key) {
					self[key] = self[datakey][key];
				});
				debug.log("object after resolve(", datakey, ") is: ", self);
			}
			return obj;
		};

		/** Unresolve object back into internal database data */
		obj.unresolve = function(datakey) {
			datakey = datakey || builder.datakey;
			var data = {};
			//Object.keys(self).filter(function(key) { return key[0] === '$' ? true : false; }).forEach(function(key) {
			//	data[key] = self[key];
			//});

			Object.keys(self).filter(function(key) { return key[0] !== '$' ? true : false; }).forEach(function(key) {
				//if(self[datakey] === undefined) {
				//	self[datakey] = {};
				//}
				data[key] = self[key];
			});

			return data;
		};

		return obj;
	}
	
	/** Internal meta values */

	builder.keys = opts.keys || [];
	builder.datakey = opts.datakey || '$meta';
	builder.table = opts.table;

	return builder;
}

module.exports = meta;

/* EOF */
