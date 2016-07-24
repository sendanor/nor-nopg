/** Query object */

"use strict";

var debug = require('nor-debug');
//var is = require('nor-is');
var Predicate = require('./Predicate.js');
var ARRAY = require('nor-array');

/** SELECT query */
function Query(opts) {
	this._opts = opts || {};

	debug.assert(opts.ObjType).is('function');
	debug.assert(opts.table).ignore(undefined).is('string');
	debug.assert(opts.method).ignore(undefined).is('string');

	this.ObjType = opts.ObjType;
	this._table = opts.table || (this.ObjType && this.ObjType.meta.table);
	this._method = opts.method || 'select';

	this._fields = [];
	this._where = [];
	this._group = [];
	this._order = [];
	this._count = false;

}

/** Enable or disable COUNT(*) feature
 */
Query.prototype.count = function(value) {
	debug.assert(value).is('boolean');
	this._count = value;
};

/** Setup fields
 * @returns {string} The parameter string presentation (like '$1')
 */
Query.prototype.fields = function(fields) {
	debug.assert(fields).is('array');
	this._fields = this._fields.concat(fields);
};

/** Setup single field
 * @returns {string} The parameter string presentation (like '$1')
 */
Query.prototype.field = function(field) {
	debug.assert(field).is('object').instanceOf(Predicate);
	this._fields.push(field);
};

/** 
 * @returns {string} The parameter string presentation (like '$1')
 */
Query.prototype.where = function(condition) {
	debug.assert(condition).is('object').instanceOf(Predicate);
	this._where.push(condition);
};

/** 
 * @returns {} 
 */
Query.prototype.offset = function(o) {
	debug.assert(o).is('number');
	this._offset = o;
};

/** 
 * @returns {} 
 */
Query.prototype.limit = function(o) {
	debug.assert(o).is('string');
	this._limit = o;
};

/** Setup orders
 */
Query.prototype.orders = function(order) {
	debug.assert(order).is('array');
	this._order = this._order.concat(order);
};

/** Setup group
 */
Query.prototype.group = function(group) {
	debug.assert(group).is('array');
	this._group = this._group.concat(group);
};

/** 
 * @returns {} 
 */
Query.prototype.order = function(o) {
	debug.assert(o).is('object').instanceOf(Predicate);
	this._order.push(o);
};

/** Get the final query string
 * @returns {array} The query as first element, params as second.
 */
Query.prototype.compile = function() {

	debug.assert(this._fields).is('array').minLength(1);

	function get_string(a, g) {
		return ARRAY(a).map(function(i) { return i.getString(); }).valueOf().join(g);
	}

	function array_concat(a, b) {
		return a.concat(b);
	}

	// Get params
	var params = ARRAY( ARRAY([this._fields, this._where, this._group, this._order]).reduce(array_concat)).map(function(p) {
		return p.getParams();
	}).reduce(array_concat);

	// Get field map
	var field_id = 0;
	var fields = [];
	var field_map = {};

	function field_as(p) {
		var s = p.getString();

		if(s === '*') {
			fields.push( s );
			return;
		}

		var a = p.getMeta('datakey');
		var b = p.getMeta('key');

		field_id += 1;

		if(!a) {
			field_map[b] = b;
			fields.push(s + ' AS ' + b);
			return;
		}

		var key = a + '__' + field_id;
		field_map[key] = [a, b];

		fields.push( s + ' AS ' + key );
	}

	ARRAY(this._fields).forEach(field_as);

	// Get the query string
	var query = "SELECT ";

	if(this._count) {
		query += 'COUNT(*) AS count';
	} else {
		query += fields.join(', ');
	}

	query += " FROM " + this._table;

	if(this._where.length >= 1) {
		query += " WHERE (" + get_string(this._where, ') AND (') + ')';
	}

	if(this._group.length >= 1) {
		query += ' GROUP BY ' + get_string(this._group, ', ');
	}

	if(this._order.length >= 1) {
		query += ' ORDER BY ' + get_string(this._order, ', ');
	}

	if(this._limit) {
		query += ' LIMIT ' + this._limit;
	}

	if(this._offset) {
		query += ' OFFSET ' + this._offset;
	}


	query = Query.numerifyPlaceHolders(query);

	// Return results
	return {'query':query, 'params':params, 'fieldMap': field_map, 'ObjType': this.ObjType};
};

// Exports
module.exports = Query;

/** */
Query.numerifyPlaceHolders = function(q) {
	var i = 0;
	return q.replace(/\$/g, function() {
		i += 1;
		return '$' + i;
	});
};

/** EOF */
