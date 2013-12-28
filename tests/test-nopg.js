"use strict";

var util = require('util');
var PGCONFIG = process.env.PGCONFIG || 'postgres://test:1234567@localhost/test';
var debug = require('nor-debug');

/** Run init() at start */
beforeEach(function(done){
	var nopg = require('../src');
	nopg.start(PGCONFIG).init().then(function(db) {
		var doc = db.fetch();
		util.debug('initialized database: doc = ' + util.inspect(doc));
		return db.commit();
	}).then(function(db) {
		done();
	}).fail(function(err) {
		done(err);
	}).done();
});

/* */
describe('nopg', function(){

	var Q = require('q');
	Q.longStackSupport = true;

	var is = require('nor-is');
	var assert = require('assert');
	var nopg = require('../src');

	describe('.start', function(){

		it('is callable', function(){
			assert.strictEqual(typeof nopg.start, 'function');
		});

	});

	describe('tests', function() {

		it('.create()({"hello":"world"}) works', function(done){
			nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
				debug.log('db is ', db);
				var doc = db.fetch();
				util.debug('doc = ' + util.inspect(doc));
				assert.strictEqual(typeof doc.hello, 'string');
				assert.strictEqual(doc.hello, 'world');
				return db.commit();
			}).then(function(db) {
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});

		it.skip('.createType() and .create(Type)({"hello":"world"}) works', function(done){
			nopg.start(PGCONFIG).createType("Test")({"schema":{"type":"object"}}).create("Test")({"hello":"world"}).then(function(db) {
				debug.log('db is ', db);
				var type = db.fetch();
				var doc = db.fetch();
				util.debug('doc = ' + util.inspect(doc));
				assert.strictEqual(typeof doc.hello, 'string');
				assert.strictEqual(doc.hello, 'world');
				return db.commit();
			}).then(function(db) {
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});

		it('.create()({"hello":"world"}) and .update(doc, {"hello": "another"}) works', function(done){
			var doc;
			nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
				doc = db.fetch();
				util.debug('before doc = ' + util.inspect(doc));
				return db.update(doc, {"hello": "another"});
			}).then(function(db) {
				util.debug('updated doc = ' + util.inspect(doc));
				assert.strictEqual(typeof doc.hello, 'string');
				assert.strictEqual(doc.hello, 'another');
				return db.commit();
			}).then(function(db) {
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});

	});

});

/* EOF */
