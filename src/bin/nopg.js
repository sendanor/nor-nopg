"use strict";

// Workaround since the CLI command does not yet support NewRelic
process.env.NEW_RELIC_ENABLED = 'FALSE';

var $Q = require('q');
var argv = require('optimist').boolean('v').argv;
var util = require('util');
var ARRAY = require('nor-array');
var NoPg = require('../');
var debug = require('nor-debug');

// Set default timeout for these operations as 1 hour unless it is already longer
//if(NoPg.defaults.timeout < 3600000) {
//	NoPg.defaults.timeout = 3600000;
//}

/// Disable timeout
NoPg.defaults.timeout = 0;

var PGCONFIG = argv.pg || process.env.PGCONFIG || 'postgres://localhost:5432/test';

var actions = {};

if(argv.v) {
	$Q.longStackSupport = true;
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
	console.log('  help      -- print this help');
	console.log('  test      -- test server features');
	console.log('  init      -- initialize database');
	console.log('  types     -- list types');
	console.log('  documents -- list documents');
};

/** Initialize database */
actions.init = function action_init() {
	//debug.log("Executing");
	return NoPg.start(PGCONFIG).init().commit().then(function() {
		console.log('init: Successfully initialized database');
	});
};

/** Returns markdown formated table */
function markdown_table(headers, table) {
	// FIXME: Implement better markdown table formating
	return ARRAY([headers, [ "---", "---" ]]).concat(table).map(function(cols) {
		return '| ' + ARRAY(cols).join(' | ') + ' |';
	}).join('\n');
}

/** List types */
actions.types = function action_types() {
	//debug.log("Executing");
	var keys = ['_', 'v', '$0'];
	var opts = {};
	ARRAY(Object.keys(argv)).filter(function(k) {
		return keys.indexOf(k) === -1 ? true : false;
	}).forEach(function(key) {
		if (key[0] === '-') {
			opts[ '$' + key.substr(1) ] = argv[key];
		} else {
			opts[key] = argv[key];
		}
	});
	if(Object.keys(opts).length === 0) {
		opts = undefined;
	}
	//debug.log('opts = ', opts);
	return NoPg.start(PGCONFIG).searchTypes(opts).commit().then(function(db) {
		var types = db.fetch();
		var table = ARRAY(types).map(function(type) {
			return [type.$id, type.$name];
		}).valueOf();
		console.log( markdown_table([ "$id", "$name" ], table) );

	});
};

/** Test server features */
actions.test = function action_test() {
	//debug.log("Executing");
	return NoPg.start(PGCONFIG).test().commit().then(function() { console.log("test: OK"); });
};

/* Do actions */
$Q.fcall(function() {

	/* Test arguments */
	if (argv._.length === 0) {
		return $Q.fcall(actions.help);
	}

	return ARRAY(argv._).map(function(action) {
		if(actions[action] === undefined) {
			throw ""+action + ": Unknown action";
		}

		//debug.log("Scheduled action for ", action);

		return function() {
			return $Q.fcall(actions[action]).fail(function(err) {
				if(argv.v) {
					throw err;
				}
				throw new TypeError( ""+action + ": Failed: " + err );
			});
		};
	}).reduce(function (soFar, f) {
		return soFar.then(f);
	}, $Q(undefined));

}).then(function() {
	// FIXME: Implement automatic shutdown, now pg still listens.
	//debug.log("Returning with exit status 0");
	process.exit(0);
}).fail(function(err) {
	console.error(''+err);

	if (argv.v) {
		debug.error(err);
	}

	process.exit(1);
}).done();

/* EOF */
