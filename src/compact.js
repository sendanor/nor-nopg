
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

			debug.log('checking uuid as key');
			var has_uuid_key = fun.internal.cursors.some(function(c) {
				return c.key === uuid;
			});

			if(has_uuid_key){
				debug.log('has_uuid_key');
				if(documents.hasOwnProperty(uuid)) {
					fun(JSON.parse(JSON.stringify(documents[uuid])));
				} else {
					fun({'$id': uuid});
				}
				return;
			}

			fun(uuid);
		});
	});

	/*
	var documents_copy = JSON.parse(JSON.stringify(documents));
	ARRAY(Object.keys(documents)).forEach(function(key) {
		var value = documents[key];
		if(value.hasOwnProperty('$documents')) {
			value.$documents = JSON.parse(JSON.stringify(documents_copy));
		}
	});
	*/

	debug.assert(doc).is('object');

	if(is.array(doc)) {

		ARRAY(doc).forEach(function(id, i) {

			var d = documents[id];
			debug.assert(d).is('object');
			debug.assert(d.$id).is('uuid').equals(id);

			var documents_ = JSON.parse(JSON.stringify(documents));

			// Make sure there is no circular reference back to root
			if(documents_.hasOwnProperty(d.$id)) {
				delete documents_[d.$id];
			}

			// Make sure the `d` has our saved $documents
			d.$documents = documents_;

			// Replace UUID with the document
			doc[i] = d;
		});

	} else {

		// Make sure there is no circular reference back to root
		if(documents.hasOwnProperty(doc.$id)) {
			delete documents[doc.$id];
		}

		// Make sure the `doc` has our saved $documents
		doc.$documents = documents;
	}

	//debug.log('doc = ', doc);

	// Scan again
	cache = null;
	uuids = null;
	cache = scan(doc, {
		"cursors": true
	});

	uuids = ARRAY(Object.keys(cache)).filter(is.uuid).valueOf();

	// Remove circular references
	//debug.log('cache.circulars.length = ', cache.circulars.length);
	ARRAY(cache.circulars).forEach(function(f) {
		var obj = f();
		//debug.log('obj = ', obj);
		if(is.obj(obj) && is.uuid(obj.$id)) {
			f(obj.$id);
		} else {
			f(null);
		}
	});

	return doc;
};

/* EOF */
