
"use strict";

var debug = require('nor-debug');
var ARRAY = require('nor-array');
var scan = require('./scan.js');
var merge = require('./merge.js');

/** Scan document for same partial objects and merge them
 * @param doc {object} The document to expand
 * @param opts {object} The options (optional)
 * @param opts.inplace {object} Expand document inplace. Does not make new copy.
 * @returns {object} The expanded copy of document
 */
module.exports = function expand_objects(doc, opts) {
	debug.assert(doc).is('object');
	opts = opts || {};
	debug.assert(opts).is('object');

	var _inplace = opts.inplace ? true : false;

	if(!_inplace) {
		doc = JSON.parse(JSON.stringify(doc));
	}

	var cache = scan(doc);
	ARRAY(Object.keys(cache)).forEach(function(key) {
		merge(cache[key]);
	});
	return doc;
};

/* EOF */
