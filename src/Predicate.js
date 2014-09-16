/**
 * nor-nopg -- NoSQL database library for PostgreSQL
 * Copyright 2014 Sendanor <info@sendanor.fi>,
 *           2014 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

"use strict";

//var debug = require('nor-debug');
var ARRAY = require('nor-array');

/** */
function Predicate(format, params, meta) {
	this._format = format;
	this._params = params || [];
	this._meta = meta || {};
}

/** */
Predicate.prototype.getString = function() {
	return this._format;
};

/** */
Predicate.prototype.getParams = function() {
	return [].concat( this._params );
};

/** Join multiple predicates into one with `op` operator */
Predicate.join = function(predicates, op) {
	var items = ARRAY(predicates).map(function(p) { return p.getString(); });
	var params = ARRAY(predicates).map(function(p) { return p.getParams(); }).reduce(function(a, b) {
		return a.concat(b);
	});
	return new Predicate( '(' + items.join(') '+op+' (') + ')', params);
};

/** Returns meta information */
Predicate.prototype.getMeta = function(key) {
	return this._meta[key];
};

/** Returns meta information */
Predicate.prototype.getMetaObject = function() {
	return this._meta;
};

// Exports
module.exports = Predicate;

/* EOF */
