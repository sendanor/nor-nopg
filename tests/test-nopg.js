"use strict";

/* */
describe('nopg', function(){

	var Q = require('q');
	Q.longStackSupport = true;

	var is = require('nor-is');
	var assert = require('assert');

	var nopg = require('../src');

	describe('.start', function(){

		it('is callable', function(){ assert.strictEqual(typeof nopg.start, 'function'); });

	});

});

/* EOF */
