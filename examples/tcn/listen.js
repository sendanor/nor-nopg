/* TCN event test */
"use strict";
var debug = require('nor-debug');
var _Q = require('q');
var PGCONFIG = process.env.PGCONFIG;
var nopg = require('../../src/index.js');

_Q.fcall(function() {
	return nopg.connect(PGCONFIG).then(function(db) {
		return db.on('create', function db_on_create(id) {
			// internal tcn payload = "documents",I,"id"='0c402f6f-8126-5dc3-a4df-20035bc8304d'
			debug.log('id =', id);
		}).on('update', function db_on_update(id) {
			// internal tcn payload = "documents",U,"id"='b6913d79-d37a-5977-94b5-95bdfe5cccda'
			debug.log('id =', id);
		}).on('delete', function db_on_delete(id) {
			// internal tcn payload = "documents",D,"id"='0e6fe442-e392-5a38-9ff3-b13d7c6a95fa'
			debug.log('id =', id);
		}).on('createType', function db_on_createType(id) {
			// internal tcn payload = "types",I,"id"='0c402f6f-8126-5dc3-a4df-20035bc8304d'
			debug.log('id =', id);
		}).on('updateType', function db_on_updateType(id) {
			// internal tcn payload = "types",U,"id"='0c402f6f-8126-5dc3-a4df-20035bc8304d'
			debug.log('id =', id);
		}).on('deleteType', function db_on_deleteType(id) {
			// internal tcn payload = "types",D,"id"='0c402f6f-8126-5dc3-a4df-20035bc8304d'
			debug.log('id =', id);
		});
	});
}).fail(function(err) {
	debug.error(err);
}).done();
