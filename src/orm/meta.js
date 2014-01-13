/* nor-nopg -- Implementation of meta objects for `NoPg.Document`, `NoPg.Type`, `NoPg.Attachment` and `NoPg.Lib`. */

var pghelpers = require('../pghelpers.js');
var debug = require('nor-debug');

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function meta(opts) {
	opts = opts || {};

	if(!opts.parsers) { opts.parsers = {}; }

	function builder(self) {
		//debug.log("meta::builder(self=", self, ")");
		var obj = {};

		/** Set meta keys */
		obj.set_meta_keys = function(data) {
			//debug.log("meta.set_meta_keys(data=", data, ")");

			//debug.log("builder.datakey = ", builder.datakey);
			//debug.log("self = ", self);

			// Search initial meta keys
			builder.keys.forEach(function(key) {
				if(data[key] !== undefined) {
					if(opts.parsers[key] === 'function') {
						if(data[key]) {
							self[key] = require('../fun.js').toFunction(data[key]);
						}
					} else {
						self[key] = clone(data[key]);
					}
				}
			});

			// Move normal keys to default JSON object ($content or $meta depending of type)

			if(! self[builder.datakey] ) {
				self[builder.datakey] = {};
			}

			Object.keys(data).filter(function(key) {
				return key[0] !== '$';
			}).forEach(function(key) {
				self[builder.datakey][key] = clone(data[key]);
				delete self[key];
			});

			//debug.log("object after set_meta_keys(", data, ") is: ", self);
			return obj;
		};
		
		/** Resolve single object key into top level */
		obj.resolve = function(datakey) {
			//debug.log("meta.resolve(datakey=", datakey, ")");
			datakey = datakey || builder.datakey;
			//debug.log("datakey = ", datakey);
			//debug.log("self = ", self);

			if(self[datakey]) {
				Object.keys(self[datakey]).forEach(function(key) {
					self[key] = clone(self[datakey][key]);
				});
				//debug.log("object after resolve(", datakey, ") is: ", self);
			}
			return obj;
		};

		/** Unresolve object back into internal database data */
		obj.unresolve = function(datakey) {
			//debug.log("meta.unresolve(datakey=", datakey, ")");
			datakey = (datakey || builder.datakey) .substr(1);

			//debug.log("datakey = ", datakey);
			//debug.log("self = ", self);

			var data = {};

			// Copy table columns
			builder.keys.filter(function(key) {
				return key[0] === '$' ? true : false;
			}).map(function(key) {
				return key.substr(1);
			}).forEach(function(key) {
				if(self['$'+key] === undefined) {
					return;
				}
				
				//if(self['$'+key] instanceof Function) {
				//	self['$'+key] = pghelpers.escapeFunction(self['$'+key]);
				//}
				
				if(self['$'+key] instanceof Function) {
					self['$'+key] = require('../fun.js').toString(self['$'+key]);
				}
				
				data[key] = clone(self['$'+key]);
			});

			// Copy plain data
			Object.keys(self).filter(function(key) {
				return key[0] !== '$' ? true : false;
			}).forEach(function(key) {
				if(!data[datakey]) {
					data[datakey] = {};
				}
				data[datakey][key] = clone(self[key]);
			});

			//debug.log("data after unresolve: ", data);
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
