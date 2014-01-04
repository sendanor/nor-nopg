#!/usr/bin/env node
var argv = require('optimist').argv;
var util = require('util');
var fs = require('nor-fs');
var pg = require('nor-pg');

var pgconfig = argv.pg || process.env.PG_CONFIG || 'psql://localhost:5432/test';

var file = argv.file;
var name = argv.name || require('path').basename(file, '.js');
var table_name = argv.table || 'libs';
var content_type = '' + (argv['content-type'] || 'application/javascript');

if(!file) {
	console.log('USAGE: import-lib [--pg=PGCONFIG] [--name=NAME] [--table=NAME] [--content-type=MIMETYPE] --file=LIBFILE');
	console.log('Note: You can also set PG_CONFIG environment variable instead of --pg (now it is ' + pgconfig + ')');
	// FIXME: Add description of options
	process.exit(2);
}

var data = fs.sync.readFile(file, {'encoding':'utf8'});

var meta = {'content-type':content_type};

// FIXME: Escape or verify table names

pg.start(pgconfig).query('INSERT INTO "'+table_name+'" (name, content, meta) VALUES ($1, $2, $3)', [name, data, meta]).commit().then(function() {
	console.log('Done.');
	// FIXME: Implement automatic shutdown, now pg still listens.
	process.exit(0);
}).fail(function(err) {
	util.error(err.stack || err);
	process.exit(0);
}).done();

/* EOF */
