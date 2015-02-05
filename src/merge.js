"use strict";

var is = require('nor-is');
var debug = require('nor-debug');
var ARRAY = require('nor-array');

/** Merge two objects */
function _merge_object(a, b) {
	debug.assert(a).is('object');
	debug.assert(b).is('object');

	// Get unique keys from both objects
	var tmp = {};
	ARRAY( Object.keys(a).concat(Object.keys(b)) ).forEach(function(key) {
		tmp[key] = true;
	});
	var keys = Object.keys(tmp);

	// Search each property and clone with the better option
	ARRAY(keys).forEach(function(key) {
		var a_is = a.hasOwnProperty(key);
		var b_is = b.hasOwnProperty(key);

		// If only A is missing
		if( (!a_is) && (b_is) ) {
			a[key] = b[key];
			return;
		}

		// If only B is missing
		if( a_is && (!b_is) ) {
			b[key] = a[key];
			return;
		}

		// If both exists, we need to be smart.

		// Ignore same elements
		if(a[key] === b[key]) {
			return;
		}

		var a_is_true = a[key] ? true : false;
		var b_is_true = b[key] ? true : false;

		// If only A is true
		if(a_is_true && (!b_is_true)) {
			b[key] = a[key];
			return;
		}

		// If only B is true
		if( (!a_is_true) && b_is_true) {
			a[key] = b[key];
			return;
		}

		// Ignore if both are false
		if( (!a_is_true) && (!b_is_true) ) {
			return;
		}

		// If both are true, we must be really smart.

		var a_type = typeof a[key];
		var b_type = typeof b[key];

		var a_is_object = a_type === "object";
		var b_is_object = b_type === "object";

		var both_are_objects = a_is_object && b_is_object;

		// If both are arrays
		if( both_are_objects && (a[key] instanceof Array) && (b[key] instanceof Array) ) {
			var ids_mapped = {};

			var tmp = [].concat(a[key]);

			ARRAY(a[key]).forEach(function(v) {
				if(v && v.$id) {
					ids_mapped[v.$id] = true;
					return;
				}
			});

			ARRAY(b[key]).forEach(function(v) {
				var id = v && v.$id;

				if(id && ids_mapped.hasOwnProperty(id)) {
					return;
				}

				if( tmp.indexOf(v) >= 0 ) {
					return;
				}

				if(id) {
					ids_mapped[id] = true;
				}

				tmp.push(v);
			});

			a[key] = tmp;
			b[key] = tmp;
			return;
		}

		var a_has_id = a_is_object && a[key].hasOwnProperty('$id');
		var b_has_id = b_is_object && b[key].hasOwnProperty('$id');

		// If both are objects
		if( both_are_objects ) {

			// Ignore if these objects both have identification code
			if(a_has_id && b_has_id) {
				return;
			}

			return _merge_object(a[key], b[key]);
		}

		// Ignore non-empty non-equal strings, there is nothing we can do about that
		if(is.string(a[key]) && is.string(b[key])) {
			return;
		}

		// Ignore non-empty non-equal numbers, there is nothing we can do about that
		if(is.number(a[key]) && is.number(b[key])) {
			return;
		}

		debug.warn('No implementation to merge {' + a_type + '} `', a[key] ,'` with {' + b_type + '} `', b[key], '`');
	});
}

/** Merge properties in array of objects. This method will only update the
 * properties this object directly owns -- it will not touch other objects
 * which have the $id property.
 * @param objs {array} The array of partial objects
 */
module.exports = function merge_objects(objs_) {
	debug.assert(objs_).is('array');

	// We cannot do anything if less than one element
	if(objs_.length <= 1) {
		return objs_;
	}

	var objs = [].concat(objs_);
	var a = objs.shift();
	debug.assert(a).is('object');

	// First run will make sure A has everything from other objects
	ARRAY(objs).forEach(function merge_objects_(b) {
		debug.assert(b).is('object');
		_merge_object(a, b);
	});

	// Second run fill make sure each other object has everything A has now
	ARRAY(objs).forEach(function merge_objects_(b) {
		debug.assert(b).is('object');
		_merge_object(a, b);
	});

};

/** EOF */
