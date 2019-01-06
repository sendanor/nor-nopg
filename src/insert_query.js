/** InsertQuery object */

"use strict";

import parse_keyword_name from './parse_keyword_name.js';
import first_letter_is_dollar from './first_letter_is_dollar.js';
import debug from '@norjs/debug';
import ARRAY from 'nor-array';

/** Get function which gets property of data */
function get_data(data) {
	return function get_data_(key) {
		return data[key];
	};
}

/** INSERT query */
function InsertQuery(opts) {
	this._opts = opts || {};

	debug.assert(opts.ObjType).is('function');
	debug.assert(opts.table).ignore(undefined).is('string');
	debug.assert(opts.method).ignore(undefined).is('string');
	debug.assert(opts.data).is('object');

	this.ObjType = opts.ObjType;
	this._table = opts.table || (this.ObjType && this.ObjType.meta.table);
	this._method = opts.method || 'insert';
	this._data = opts.data;
}

/** Get the final query string
 * @returns {array} The query as first element, params as second.
 */
InsertQuery.prototype.compile = function() {

	var ObjType = this.ObjType;

	var data = this._data;

	data = (new ObjType(data)).valueOf();

	var _get_data = get_data(data);

	// FIXME: These array loops could be joined as one loop. #performance

	// Filter only $-keys which are not the datakey
	var keys = ARRAY(ObjType.meta.keys).filter(first_letter_is_dollar).map(parse_keyword_name).filter(_get_data);

	if(keys.valueOf().length === 0) { throw new TypeError("No data to submit: keys array is empty."); }

	var query = "INSERT INTO " + (this._table) +
	      " ("+ keys.join(', ') +
	      ") VALUES (" + keys.map(function(k, i) { return '$' + (i+1); }).join(', ') +
	      ") RETURNING *";

	var params = keys.map(_get_data).valueOf();

	// Return results
	return {'query':query, 'params': params, 'ObjType': ObjType};
};

// Exports
module.exports = InsertQuery;

/** EOF */
