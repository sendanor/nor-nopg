#!/usr/bin/env node

var Q = require('q');
var argv = require('optimist').boolean('v').argv;
var util = require('util');
var NoPg = require('../src');
var debug = require('nor-debug');

var PGCONFIG = argv.pg || process.env.PGCONFIG || 'psql://localhost:5432/test';

var actions = {};

if(argv.v) {
	debug.setNodeENV('development');
} else {
	debug.setNodeENV('production');
}

//debug.log('PGCONFIG = ', PGCONFIG);

/** Output usage information */
actions.help = function action_help() {
	//debug.log("Executing");
	console.log("USAGE: nopg [--pg='psql://localhost:5432/test'] help|test|init");
	console.log('where:');
	console.log('  help -- print this help');
	console.log('  test -- test server features');
	console.log('  init -- initialize database');
};

/** Initialize database */
actions.init = function action_init() {
	//debug.log("Executing");
	return NoPg.start(PGCONFIG).init().commit().then(function() {
		console.log('init: Successfully initialized database');
	});
};

/** Test server features */
actions.test = function action_test() {
	//debug.log("Executing");
	return NoPg.start(PGCONFIG).test().commit().then(function() { console.log("test: OK"); });
};

/* Do actions */
Q.fcall(function() {

	/* Test arguments */
	if (argv._.length === 0) {
		return Q.fcall(actions.help);
	}

	var funcs = argv._.map(function(action) {
		if(actions[action] === undefined) {
			throw ""+action + ": Unknown action";
		}

		//debug.log("Scheduled action for ", action);

		return function() {
			return Q.fcall(actions[action]).fail(function(err) {
				throw ""+action + ": Failed: " + err;
			});
		};
	});

	//debug.log("funcs loaded ", funcs.length);

	return funcs.reduce(function (soFar, f) {
	    return soFar.then(f);
	}, Q(undefined));

}).then(function() {
	// FIXME: Implement automatic shutdown, now pg still listens.
	//debug.log("Returning with exit status 0");
	process.exit(0);
}).fail(function(err) {
	util.error(''+err);
	process.exit(1);
}).done();

/* EOF */
