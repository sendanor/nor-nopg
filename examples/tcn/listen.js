/* TCN event test */
"use strict";
var debug = require('nor-debug');
var _Q = require('q');
var PGCONFIG = process.env.PGCONFIG;
var nopg = require('../../src/index.js');

_Q.fcall(function() {
	return nopg.connect(PGCONFIG).then(function(db) {
		return db.on('create', function db_on_create(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('update', function db_on_update(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('delete', function db_on_delete(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('createType', function db_on_createType(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('updateType', function db_on_updateType(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('deleteType', function db_on_deleteType(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('Test#create', function db_on_Test_create(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('Test#update', function db_on_Test_update(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('Test#delete', function db_on_Test_delete(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('Test3#createType', function db_on_Test3_createType(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('Test3#updateType', function db_on_Test3_updateType(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		}).on('Test3#deleteType', function db_on_Test3_deleteType(id, event, type) {
			debug.log('id =', id, '\n',
				'event = ', event, '\n',
				'type = ', type, '\n' );
		});
	});
}).fail(function(err) {
	debug.error(err);
}).done();
