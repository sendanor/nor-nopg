"use strict";

var pgconfig = process.env.PGCONFIG || 'postgres://test:1234567@localhost/test';

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

	describe('tests', function(){

		it('.create({"hello":"world"}) works', function(done){
			nopg.start(pgconfig).create({"hello":"world"}).commit().then(function(db) {
				done();
			}).fail(function(err) {
				done(err);
			}).done();
		});

		afterEach(function(done){
		});

	});

});

/* EOF */
