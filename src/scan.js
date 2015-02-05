
"use strict";

var is = require('nor-is');
var debug = require('nor-debug');
var ARRAY = require('nor-array');

var internal = {};

/** */
function _register_obj(cache, obj) {
	debug.assert(cache).is('object');
	debug.assert(obj).is('object');
	debug.assert(obj.$id).is('uuid');

	var id = obj.$id;
	if(!is.array(cache[id])) {
		cache[id] = [];
	}
	cache[id].push(obj);
}

/** */
function _scan_variable(cache, obj) {
	debug.assert(cache).is('object');

	if(is.obj(obj)) {
		if(is.uuid(obj.$id)) {
			_register_obj(cache, obj);
		}
		return internal._scan_properties(cache, obj);
	}

	if(is.array(obj)) {
		return internal._scan_array(cache, obj);
	}

	// Ignore strings, numbers, etc
	if( is.string(obj) || is.number(obj) || is.boolean(obj) || is.nul(obj) || is.undef(obj) ) {
		return;
	}

	debug.warn('Unknown type of data detected: {' + typeof obj + '} ' + obj);
}

/** */
function _scan_properties(cache, obj) {
	debug.assert(cache).is('object');
	debug.assert(obj).is('object');

	ARRAY(Object.keys(obj)).forEach(function scan_property(key) {
		var value = obj[key];
		return _scan_variable(cache, value);
	});
}

/** */
function _scan_array(cache, objs) {
	debug.assert(cache).is('object');
	debug.assert(objs).is('array');
	ARRAY(objs).forEach(function scan_array_(obj) {
		return _scan_variable(cache, obj);
	});
}

// Setup internal mappings
internal._scan_properties = _scan_properties;
internal._scan_array = _scan_array;

/** Scan object(s) recursively and returns every scanned object mapped with identification property $id
 * @param objs {Array|object} Object or array of objects to scan
 * @returns {object} Object like `{'<ID>': [{'$id':'<ID>',...}, '<ID2>': ...]}`
 */
module.exports = function scan_objects(objs) {
	if(!is.array(objs)) {
		objs = [objs];
	}
	debug.assert(objs).is('array');
	objs = [].concat(objs);

	var cache = {};
	_scan_array(cache, objs);
	return cache;
};

/* EOF */
