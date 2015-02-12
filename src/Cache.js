
"use strict";

var is = require('nor-is');
var debug = require('nor-debug');
var ARRAY = require('nor-array');
var VariableStore = require('./VariableStore.js');
var InternalCursor = require('./InternalCursor.js');

/** The cache object */
function Cache(opts) {
	//debug.log('new Cache');

	opts = opts || {};
	debug.assert(opts).is('object');

	// {boolean} True if this cache is using cursors
	this._has_cursors = opts.cursors ? true : false;

	// All cursors in a VariableStore
	if(this._has_cursors) {
		this._cursors = new VariableStore();
		this._parents = new VariableStore();
		this._cursor_map = {};
	}

}

/** Register cursor in the cache */
Cache.prototype.registerCursor = function cache_register_cursor(f) {
	//debug.log('registerCursor');

	var cache = this;

	debug.assert(f).is('function');
	var cursor_id = cache._cursors.saveIfMissing(f);
	debug.assert(cursor_id).is('number');

	ARRAY(f.internal.cursors).forEach(function(c) {
		debug.assert(c).is('object');
		var parent = c.parent;
		var key = c.key;
		debug.assert(parent).is('object');
		debug.assert(key).is('defined');
		var parent_id = cache._parents.saveIfMissing(parent);
		debug.assert(parent_id).is('number');
		var index = '[' + parent_id + ',' + JSON.stringify(key) + ']';
		cache._cursor_map[index] = f;
	});

	return cursor_id;
};

/** Add new reference to value in the cursor and cache */
Cache.prototype.addToCursor = function cache_add_cursor(f, parent_, key_) {
	debug.assert(f).is('function');
	debug.assert(parent_).is('object');
	debug.assert(key_).is('defined');

	var cache = this;

	var cursor_id = cache._cursors.saveIfMissing(f);
	debug.assert(cursor_id).is('number');

	var parent_id_ = cache._parents.saveIfMissing(parent_);
	debug.assert(parent_id_).is('number');

	var index_ = '[' + parent_id_ + ',' + JSON.stringify(key_) + ']';

	f.internal.add(parent_, key_);
	cache._cursor_map[index_] = f;

	return cursor_id;
};

/** Find cursor using parent and key
 * @returns {function|undefined} The cursor function or undefined if not found.
 */
Cache.prototype.findCursor = function cache_find_cursor(parent, key) {
	//debug.log('findCursor');
	debug.assert(parent).is('object');
	debug.assert(key).is('defined');
	var cache = this;
	var parent_id = cache._parents.search(parent);
	if(parent_id === undefined) {
		return;
	}
	debug.assert(parent_id).is('number');
	var index = '[' + parent_id + ',' + JSON.stringify(key) + ']';
	return cache._cursor_map[index];
};

/** Returns get/setter function */
Cache.prototype.createCursor = function build_cursor(parent_, key_) {
	//debug.log('createCursor');
	var cache = this;
	debug.assert(cache).is('object');

	var internal = new InternalCursor(parent_, key_);

	/** Get or set variable pointed by this function iterator */
	var f = function cache_cursor(value) {
		return (arguments.length === 1) ? internal.setValue(value) : internal.getValue();
	};

	f.internal = internal;
	f.id = cache.registerCursor(f);

	return f;
};

/** */
Cache.prototype.registerDocument = function _register_obj(obj, parent, key) {
	//debug.log('registerDocument');
	var cache = this;

	debug.assert(cache).is('object');
	debug.assert(obj).is('object');
	debug.assert(obj.$id).is('uuid');

	var has_cursors = cache._has_cursors;

	var id = obj.$id;

	if(!is.array(cache[id])) {
		cache[id] = [];
	}

	var cached;

	if(has_cursors) {
		cached = cache.createCursor(parent, key);
	} else {
		cached = obj;
	}

	cache[id].push(cached);
};

/** */
Cache.prototype.scanVariable = function cache_scan_variable(obj, parent, key) {
	//debug.log('scanVariable');
	var cache = this;

	if(is.array(obj)) {
		return cache.scanArray(obj);
	}

	if(is.obj(obj)) {
		if(is.uuid(obj.$id)) {
			cache.registerDocument(obj, parent, key);
		}
		return cache.scanProperties(obj);
	}

	// Ignore strings, numbers, etc
	if( is.string(obj) || is.number(obj) || is.boolean(obj) || is.nul(obj) || is.undef(obj) ) {
		return;
	}

	debug.warn('Unknown type of data detected: {' + typeof obj + '} ' + obj);
};

/** */
Cache.prototype.scanProperties = function cache_scan_properties(obj) {
	//debug.log('scanProperties');
	var cache = this;

	debug.assert(cache).is('object');
	debug.assert(obj).is('object');

	ARRAY(Object.keys(obj)).forEach(function scan_property(key) {
		var value = obj[key];
		return cache.scanVariable(value, obj, key);
	});
};

/** */
Cache.prototype.scanArray = function cache_scan_array(objs) {
	//debug.log('scanArray');
	var cache = this;
	debug.assert(cache).is('object');
	debug.assert(objs).is('array');
	ARRAY(objs).forEach(function cache_scan_array_(obj, i) {
		return cache.scanVariable(obj, objs, i);
	});
};

// Exports
module.exports = Cache;

/* EOF */
