/** Builder for data views
 * 
 * ***Please note:*** This is obsolete synchronous version of REST resource 
 * view. See `nor-rest-view` module for newer asynchronous implementation.
 * 
 */

"use strict";

var debug = require('nor-debug');
var merge = require('merge');
var copy = require('nor-data').copy;
var is = require('nor-is');
var debug = require('nor-debug');
var strip = require('./strip.js');
var ref = require('nor-ref');

/** Compute keys */
function compute_keys(o, opts, req, res) {
	debug.assert(o).is('object');
	debug.assert(opts).is('object');
	Object.keys(opts).forEach(function(key) {
		debug.assert(opts[key]).is('function');
		o[key] = opts[key].call(o, req, res);
	});
	return o;
}

/** */
function fix_object_ids(o) {
	if(is.obj(o) && is.uuid(o.$id)) {
		//debug.log('entry in path: ', o);
		return o.$id;
	}
	return o;
}

/** Render `path` with optional `params` */
function render_path(path, params) {
	params = params || {};
	return [].concat(is.array(path) ? path : [path]).map(function(p) {
		return p.replace(/:([a-z0-9A-Z\_]+)/g, function(match, key) {
			if(params[key] === undefined) {
				return ':'+key;
			}
			return ''+fix_object_ids(params[key]);
		});
	});
}

/** Builds a builder for REST data views */
function ResourceView(opts) {
	var view = this;
	opts = copy(opts || {});

	debug.assert(opts).is('object');
	debug.assert(opts.path).is('string');

	view.opts = {};
	view.opts.keys = opts.keys || ['$id', '$type', '$ref'];
	view.opts.path = opts.path;
	view.opts.elementPath = opts.elementPath;

	view.Type = opts.Type;

	if(is.obj(opts.compute_keys)) {
		view.compute_keys = opts.compute_keys;
	}

	//debug.log("view.opts = ", view.opts);
}

ResourceView.views = {};

/** Returns build function for a data view of REST element */
ResourceView.prototype.element = function(req, res, opts) {
	var view = this;
	debug.assert(req).is('object');
	debug.assert(res).is('object');
	//debug.log('view.opts = ', view.opts);
	//debug.log('opts = ', opts);
	debug.assert(view.opts).is('object');

	var no_local_path = !(opts && opts.path && opts.elementPath);
	opts = merge(copy(view.opts), copy(opts || {}));
	if(no_local_path && opts.elementPath) {
		opts.path = opts.elementPath;
	}

	//debug.log('(after) opts = ', opts);
	var views = opts.views || ResourceView.views;
	return function(item) {

		if(is.string(item)) {
			debug.assert(item).is('uuid');
			item = {'$id': item};
		}
		debug.assert(item).is('object');

		//debug.log('opts.params = ', opts.params);
		//debug.log('item = ', item);

		opts.params = is.obj(opts.params) ? opts.params : {};
		var params = merge(opts.params, item);

		//debug.log('params = ', params);

		if(is.array(item)) {
			debug.warn("ResourceView.prototype.element() called with an Array. Is that what you intended?");
		}


		var body = strip(item).specials().get();
		opts.keys.forEach(function(key) {
			var path = [req].concat(render_path(opts.path, params)).concat([item.$id]);
			//debug.log("path = ", ref.apply(undefined , path));

			//
			if( (key === '$ref') && is.uuid(item.$id) ) {
				body.$ref = ref.apply(undefined, path);
				return;
			}

			//
			if( is.uuid(item[key]) && is.object(views[(''+key).toLowerCase()]) ) {
				body[key] = views[key].element(req, res)(item[key]);
				return;
			}

			//
			if( is.object(item[key]) && is.uuid(item[key].$id) && is.undef(item[key].$ref) && is.object(views[(''+key).toLowerCase()]) ) {
				body[key] = views[key].element(req, res)(item[key]);
				return;
			}

			//
			if(item[key] !== undefined) {
				body[key] = item[key];
				return;
			}

		});
		//debug.log('body = ', body);

		if(!body.$type) {
			body.$type = view.Type;
		}

		if(is.obj(view.compute_keys)) {
			body = compute_keys(body, view.compute_keys, req, res);
		}

		if(is.obj(opts.compute_keys)) {
			body = compute_keys(body, opts.compute_keys, req, res);
		}

		return body;
	};
};

/** Returns build function for a data view of REST collection -- which is a collection of REST elements */
ResourceView.prototype.collection = function(req, res, opts) {
	var view = this;
	debug.assert(req).is('object');
	debug.assert(res).is('object');
	//debug.log("view.opts = ", view.opts);
	//debug.log("opts = ", opts);
	opts = merge(copy(view.opts), copy(opts || {}));
	//debug.log("(after) opts = ", opts);
	return function(items) {
		debug.assert(items).is('array');
		var element_opts = copy(opts);
		var rendered_path = render_path(element_opts.path, element_opts.params);
		var path = [req].concat(rendered_path);
		if(view.opts.elementPath) {
			element_opts.path = view.opts.elementPath;
		}
		if(opts.elementPath) {
			element_opts.path = opts.elementPath;
		}
		//debug.log("element_opts = ", element_opts);
		var body = {};
		body.$ref = ref.apply(undefined, path);
		body.$ = items.map(view.element(req, res, element_opts));
		//debug.log('body = ', body);

		if(is.obj(view.compute_keys)) {
			body = compute_keys(body, view.compute_keys, req, res);
		}

		if(is.obj(opts.compute_keys)) {
			body = compute_keys(body, opts.compute_keys, req, res);
		}

		return body;
	};
};

// Exports

module.exports = ResourceView;

/* EOF */
