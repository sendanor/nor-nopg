
"use strict";

import debug from '@norjs/debug';
import is from '@norjs/is';
import ARRAY from 'nor-array';
import scan from './scan.js';
import merge from './merge.js';

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

	var _strip = opts.strip || undefined;
	debug.assert(_strip).ignore(undefined).is('array');

	var _inplace = opts.inplace ? true : false;

	var _expand_types = opts.types;
	debug.assert(_expand_types).ignore(undefined).is('object');

	if(is.array(_expand_types)) {
		var tmp = {};
		ARRAY(_expand_types).forEach(function(t) {
			tmp[t] = true;
		});
		_expand_types = tmp;
	}

	if(!_inplace) {
		doc = JSON.parse(JSON.stringify(doc));
	}

	// Scan objects
	var cache = scan(doc, {
		"cursors": true
	});

	var uuids = ARRAY(Object.keys(cache)).filter(is.uuid).valueOf();

	// Merge same objects
	ARRAY(uuids).forEach(function(uuid) {

		var type;
		ARRAY(cache[uuid]).find(function(c) {
			var s = c();
			if(s && s.$type) {
				type = s.$type;
				return true;
			}
		});

		var properties;
		if(!is.obj(_expand_types)) {
			properties = true;
		} else {
			properties = (_expand_types.hasOwnProperty(type)) ? _expand_types[type] : undefined;
		}
		if(is.array(properties)) {
			merge(cache[uuid], {'cache': cache, 'properties': properties});
		} else if(properties === true) {
			merge(cache[uuid], {'cache': cache});
		}
	});

	// 
	if(_strip) {
		ARRAY(uuids).forEach(function(uuid) {
			var objs = cache[uuid];
			debug.assert(objs).is('array');
			ARRAY(objs).forEach(function(obj) {
				ARRAY(_strip).forEach(function(key) {
					if(obj.hasOwnProperty(key)) {
						delete obj[key];
					}
				});
			});
		});
	}

	// Scan again
	cache = null;
	uuids = null;
	cache = scan(doc, {
		"cursors": true
	});

	//uuids = ARRAY(Object.keys(cache)).filter(is.uuid).valueOf();

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
