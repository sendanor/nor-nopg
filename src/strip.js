/* $filename: strip.js $ */
/** Strip data */

"use strict";

var debug = require('nor-debug');
var copy = require('nor-data').copy;

/** Interface to strip properties from objects
 * @param data {object} The object which properties you want to manipulate
 * @returns interface which can be used to manipulate objects
 */
module.exports = function(data) {
	data = copy(data);

	var strip = {};

	/** Strip leading special properties from object `data`
	 * @returns {object} The copy of data without any properties with leading '$' or '_' letter.
	 */
	strip.specials = function strip_specials () {
		Object.keys(data).filter(function(key) {
			return ( (key.substr(0, 1) === '$') || (key.substr(0, 1) === '_') ) ? true : false;
		}).forEach(function(key) {
			delete data[key];
		});
		return strip;
	};

	/** Strip properties named as `key`
	 * @returns {object} The copy of data without any properties named as `key`.
	 */
	strip.unset = function strip_specials (key) {
		debug.assert(key).typeOf('string');
		if(data[key] !== undefined) {
			delete data[key];
		}
		return strip;
	};

	/** Get the data
	 * @returns {object} transformed data object
	 */
	strip.get = function strip_get() {
		return data;
	};

	return strip;
};

/* EOF */
