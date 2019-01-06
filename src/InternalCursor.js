
"use strict";

import debug from '@norjs/debug';
import ARRAY from 'nor-array';

/** Internal cursor object */
function InternalCursor(parent, key) {
	debug.assert(parent).is('object');
	debug.assert(key).is('defined');
	this.cursors = [{'parent':parent, 'key':key}];
}

/** */
InternalCursor.prototype.setValue = function cache_cursor_set_value(value) {
	ARRAY(this.cursors).forEach(function(c) {
		c.parent[c.key] = value;
	});
	return value;
};

/** */
InternalCursor.prototype.getValue = function cache_cursor_get_value() {
	var c = this.cursors[0];
	return c.parent[c.key];
};

/** Add new target into the cursor. Format is `.add(parent, key)`. */
InternalCursor.prototype.add = function cache_cursor_add(parent_, key_) {
	debug.assert(parent_).is('object');
	debug.assert(key_).is('defined');
	this.cursors.push({
		"parent": parent_,
		"key": key_
	});
	return;
};

// Exports
module.exports = InternalCursor;

/* EOF */
