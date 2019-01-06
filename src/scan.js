
"use strict";

import is from '@norjs/is';
import debug from '@norjs/debug';
import Cache from './Cache.js';

/** Scan object(s) recursively and returns every scanned object mapped with identification property $id
 * @param objs {Array|object} Object or array of objects to scan
 * @returns {object} Object like `{'<ID>': [{'$id':'<ID>',...}, '<ID2>': ...]}`
 */
module.exports = function scan(objs, opts) {

	if(!is.array(objs)) {
		objs = [objs];
	}
	debug.assert(objs).is('array');

	opts = opts || {};
	debug.assert(opts).is('object');

	//debug.log('Creating cache...');
	var cache = new Cache({
		cursors: opts.cursors ? true : false
	});

	//debug.log('Scanning into cache...');
	cache.scanArray(objs);

	return cache;
};

/* EOF */
