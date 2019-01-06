"use strict";

// Workaround since the CLI command does not yet support NewRelic
process.env.NEW_RELIC_ENABLED = 'FALSE';

import Q from 'q';
import ARRAY from 'nor-array';
import NoPg from '../index.js';
import debug from '@norjs/debug';
import optimist from 'optimist';

const argv = optimist.boolean('v').argv;

// Set default timeout for these operations as 1 hour unless it is already longer
//if (NoPg.defaults.timeout < 3600000) {
//	NoPg.defaults.timeout = 3600000;
//}

/// Disable timeout
NoPg.defaults.timeout = 0;

let PGCONFIG = argv.pg || process.env.PGCONFIG || 'postgres://localhost:5432/test';

let actions = {};

if (argv.v) {
	Q.longStackSupport = true;
	debug.setNodeENV('development');
} else {
	debug.setNodeENV('production');
}

//debug.log('PGCONFIG = ', PGCONFIG);

/** Output usage information */
actions.help = () => {
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
actions.init = () => {
	//debug.log("Executing");
	return NoPg.start(PGCONFIG).init().commit().then(() => {
		console.log('init: Successfully initialized database');
	});
};

/** Returns markdown formated table
 *
 * @param headers
 * @param table
 * @returns {number}
 */
function markdown_table (headers, table) {
	// FIXME: Implement better markdown table formating
	return ARRAY([headers, [ "---", "---" ]]).concat(table).map(cols => '| ' + ARRAY(cols).join(' | ') + ' |').join('\n');
}

/** List types */
actions.types = () => {
	//debug.log("Executing");
	let keys = ['_', 'v', '$0'];
	let opts = {};
	ARRAY(Object.keys(argv)).filter(k => keys.indexOf(k) === -1 ? true : false).forEach(key => {
		if  (key[0] === '-') {
			opts[ '$' + key.substr(1) ] = argv[key];
		} else {
			opts[key] = argv[key];
		}
	});
	if (Object.keys(opts).length === 0) {
		opts = undefined;
	}
	//debug.log('opts = ', opts);
	return NoPg.start(PGCONFIG).searchTypes(opts).commit().then(db => {
		let types = db.fetch();
		let table = ARRAY(types).map(type => [type.$id, type.$name]).valueOf();
		console.log( markdown_table([ "$id", "$name" ], table) );
	});
};

/** Test server features */
actions.test = () => {
	//debug.log("Executing");
	return NoPg.start(PGCONFIG).test().commit().then(() => { console.log("test: OK"); });
};

/* Do actions */
Q.fcall(() => {

	/* Test arguments */
	if  (argv._.length === 0) {
		return Q.fcall(actions.help);
	}

	return ARRAY(argv._).map(action => {
		if (actions[action] === undefined) {
			throw ""+action + ": Unknown action";
		}

		//debug.log("Scheduled action for ", action);

		return () => Q.fcall(actions[action]).fail(err => {
			if (argv.v) {
				throw err;
			}
			throw new TypeError("" + action + ": Failed: " + err);
		});
	}).reduce(( soFar, f ) => soFar.then(f), Q(undefined));

}).then(() => {
	// FIXME: Implement automatic shutdown, now pg still listens.
	//debug.log("Returning with exit status 0");
	process.exit(0);
}).fail(err => {
	console.error(''+err);

	if  (argv.v) {
		debug.error(err);
	}

	process.exit(1);
}).done();
