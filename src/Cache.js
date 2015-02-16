
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

	/** {boolean} True if this cache is using cursors */
	this._has_cursors = opts.cursors ? true : false;

	// All cursors in a VariableStore
	if(this._has_cursors) {
		this._cursors = new VariableStore();
		this._parents = new VariableStore();
		this._cursor_map = {};
	}

	/** Store for all objects */
	this.objects = new VariableStore();

	/** Array of current parents of the element which we are scanning -- this is used to find circular references */
	this._current_parents = [];

	/** Array of cursors pointing to circular references */
	this.circulars = [];

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
Cache.prototype.createCursorIfEnabled = function(obj, parent, key) {
	var cache = this;
	var has_cursors = cache._has_cursors ? true : false;
	if(has_cursors) {
		return cache.createCursor(parent, key);
	} else {
		return obj;
	}
};

/** */
Cache.prototype.registerDocument = function _register_obj(obj, parent, key) {
	//debug.log('registerDocument');
	var cache = this;
	debug.assert(cache).is('object');
	debug.assert(obj).is('object');
	debug.assert(obj.$id).is('uuid');
	var id = obj.$id;
	if(!is.array(cache[id])) {
		cache[id] = [];
	}
	var cached = cache.createCursorIfEnabled(obj, parent, key);
	cache[id].push(cached);
};

/** */
Cache.prototype.scanVariable = function cache_scan_variable(obj, parent, key) {
	//debug.log('scanVariable');
	var cache = this;

	// Detect circular references
	if( cache._current_parents.indexOf(obj) >= 0 ) {
		//debug.log('new circular reference');
		cache.circulars.push( cache.createCursorIfEnabled(obj, parent, key) );
		return;
	}

	// Detect objects we have already scanned (but which wouldn't be circular)
	var obj_id = this.objects.search(obj);
	if(obj_id) {
		return;
	}

	// Detect arrays
	if(is.array(obj)) {
		return cache.scanArray(obj);
	}

	// Detect objects
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

	// Anything else is a warning
	debug.warn('Unknown type of data detected: {' + typeof obj + '} ' + obj);
};

/** Put variable in the parents array */
Cache.prototype._add_parent = function add_parent(o) {
	this._current_parents.push( o );
	//debug.log('cache._current_parents.length = ', this._current_parents.length );
	this.objects.saveIfMissing(o);
};

/** Remove element from parents array */
Cache.prototype._remove_parent = function remove_parent(o) {
	var last = this._current_parents.pop();
	debug.assert(last).equals(o);
	//debug.log('cache._current_parents.length = ', this._current_parents.length );
};

/** */
Cache.prototype.scanProperties = function cache_scan_properties(obj) {
	//debug.log('scanProperties');
	var cache = this;

	debug.assert(cache).is('object');
	debug.assert(obj).is('object');

	cache._add_parent(obj);

	ARRAY(Object.keys(obj)).forEach(function scan_property(key) {
		var value = obj[key];
		return cache.scanVariable(value, obj, key);
	});

	cache._remove_parent(obj);
};

/** */
Cache.prototype.scanArray = function cache_scan_array(objs) {
	//debug.log('scanArray');
	var cache = this;
	debug.assert(cache).is('object');
	debug.assert(objs).is('array');

	cache._add_parent(objs);

	ARRAY(objs).forEach(function cache_scan_array_(obj, i) {
		return cache.scanVariable(obj, objs, i);
	});

	cache._remove_parent(objs);
};

// Exports
module.exports = Cache;

/* EOF */
