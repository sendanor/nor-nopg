
"use strict";

var debug = require('nor-debug');
var ARRAY = require('nor-array');
var scan = require('./scan.js');
var merge = require('./merge.js');
var is = require('nor-is');

/** Scan document for same partial objects and compact them with full objects in $documents
 * @param doc {object} The document to compact
 * @param opts {object} The options (optional)
 * @param opts.inplace {object} Expand document inplace. Does not make new copy.
 * @param opts.compact {object} Make resultting object compact. Saves full objects only in doc.$documents.
 * @returns {object} The compacted copy of document
 */
module.exports = function compact_objects(doc, opts) {
	debug.assert(doc).is('object');
	opts = opts || {};
	debug.assert(opts).is('object');

	var _inplace = opts.inplace ? true : false;

	if(!_inplace) {
		doc = JSON.parse(JSON.stringify(doc));
	}

	// Scan objects
	//debug.log('Scanning...');
	var cache = scan(doc, {
		"cursors": true
	});

	var uuids = ARRAY(Object.keys(cache)).filter(is.uuid).valueOf();

	// Merge same objects
	//debug.log('Merging...');
	ARRAY(uuids).forEach(function(uuid) {
		merge(cache[uuid], {'cache': cache});
	});

	// Save references to $documents instance
	//debug.log('Saving references...');
	var documents = {};

	// Save one instance of all documents in $documents
	ARRAY(uuids).forEach(function(uuid) {
		documents[uuid] = cache[uuid][0]();
	});

	// Replace all instances of documents with the UUID
	//debug.log('Compacting...');
	ARRAY(uuids).forEach(function(uuid) {
		ARRAY(cache[uuid]).forEach(function(fun) {
			fun(uuid);
		});
	});

	debug.assert(doc).is('obj');

	// Make sure there is no circular reference back to root
	if(documents.hasOwnProperty(doc.$id)) {
		delete documents[doc.$id];
	}

	// Make sure the `doc` has our saved $documents
	doc.$documents = documents;

	return doc;
};

/* EOF */
