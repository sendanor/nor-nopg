/** Builder for data views
 * 
 * ***Please note:*** This is obsolete synchronous version of REST resource 
 * view. See `nor-rest-view` module for newer asynchronous implementation.
 * 
 */

"use strict";

import is from '@norjs/is';
import debug from '@norjs/debug';
import ref from '@norjs/ref';
import _ from 'lodash';
import FUNCTION from 'nor-function';
import ARRAY from 'nor-array';
import merge from 'merge';
import strip from './strip.js';

const copy = (obj) => _.cloneDeep(obj);

/** Compute keys */
function compute_keys(o, opts, req, res) {
	debug.assert(o).is('object');
	debug.assert(opts).is('object');
	ARRAY(Object.keys(opts)).forEach(function(key) {
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
	return ARRAY( is.array(path) ? path : [path] ).map(function(p) {
		return p.replace(/:([a-z0-9A-Z\_]+)/g, function(match, key) {
			if(params[key] === undefined) {
				return ':'+key;
			}
			return ''+fix_object_ids(params[key]);
		});
	}).valueOf();
}

/** Builds a builder for REST data views */
function ResourceView(opts) {
	var view = this;

	var compute_keys;
	if(opts && opts.compute_keys) {
		compute_keys = opts.compute_keys;
	}

	var element_keys;
	if(opts && opts.element_keys) {
		element_keys = opts.element_keys;
	}

	var collection_keys;
	if(opts && opts.collection_keys) {
		collection_keys = opts.collection_keys;
	}

	var element_post;
	if(opts && opts.element_post) {
		element_post = opts.element_post;
	}

	var collection_post;
	if(opts && opts.collection_post) {
		collection_post = opts.collection_post;
	}

	opts = copy(opts || {});

	debug.assert(opts).is('object');
	debug.assert(opts.path).is('string');

	view.opts = {};
	view.opts.keys = opts.keys || ['$id', '$type', '$ref'];
	view.opts.path = opts.path;
	view.opts.elementPath = opts.elementPath;

	view.Type = opts.Type;

	if(is.obj(compute_keys)) {
		view.compute_keys = compute_keys;
	}

	if(is.obj(element_keys)) {
		view.element_keys = element_keys;
	}

	if(is.obj(collection_keys)) {
		view.collection_keys = collection_keys;
	}

	if(is.func(element_post)) {
		view.element_post = element_post;
	}

	if(is.func(collection_post)) {
		view.collection_post = collection_post;
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
		ARRAY(opts.keys).forEach(function(key) {
			var path = [req].concat(render_path(opts.path, params)).concat([item.$id]);
			//debug.log("path = ", FUNCTION(ref).curryApply(path));

			//
			if( (key === '$ref') && is.uuid(item.$id) ) {
				body.$ref = FUNCTION(ref).curryApply(path);
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

		if(is.obj(view.element_keys)) {
			body = compute_keys(body, view.element_keys, req, res);
		}


		if(is.obj(opts.compute_keys)) {
			body = compute_keys(body, opts.compute_keys, req, res);
		}

		if(is.obj(opts.element_keys)) {
			body = compute_keys(body, opts.element_keys, req, res);
		}


		if(is.func(opts.element_post)) {
			body = opts.element_post.call(body, req, res);
		}

		if(is.func(view.element_post)) {
			body = view.element_post.call(body, req, res);
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
		body.$ref = FUNCTION(ref).curryApply(path);
		body.$ = ARRAY(items).map(view.element(req, res, element_opts)).valueOf();
		//debug.log('body = ', body);

		//
		if(is.obj(view.compute_keys)) {
			body = compute_keys(body, view.compute_keys, req, res);
		}

		if(is.obj(view.collection_keys)) {
			body = compute_keys(body, view.collection_keys, req, res);
		}

		//
		if(is.obj(opts.compute_keys)) {
			body = compute_keys(body, opts.compute_keys, req, res);
		}

		if(is.obj(opts.collection_keys)) {
			body = compute_keys(body, opts.collection_keys, req, res);
		}

		if(is.func(opts.collection_post)) {
			body = opts.collection_post.call(body, req, res);
		}

		if(is.func(view.collection_post)) {
			body = view.collection_post.call(body, req, res);
		}

		//
		return body;
	};
};

// Exports

module.exports = ResourceView;

/* EOF */
