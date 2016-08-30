"use strict";

var _Q = require('q');
_Q.longStackSupport = true;

var crypto = require('crypto');
var fs = require('nor-fs');
var is = require('nor-is');
var assert = require('assert');
var util = require('util');
var PGCONFIG = process.env.PGCONFIG || 'pg://postgres@localhost/test';
var debug = require('nor-debug');
var nopg = require('../src');

var NOPG_TIMEOUT = process.env.NOPG_TIMEOUT ? parseInt(process.env.NOPG_TIMEOUT, 10) : undefined;

/** */
function not_in(a) {
	debug.assert(a).is('array');
	return function not_in_array(x) {
		return a.indexOf(x) === -1;
	};
}

/** Run init() at start */
before(function(){
	return nopg.start(PGCONFIG).init().then(function(db) {
		//var doc = db.fetch();
		//debug.log('initialized database: doc = ', doc);
		return db.commit();
	});
});

/* */
describe('nopg', function(){

	if(NOPG_TIMEOUT >= 2000) {
		this.timeout(NOPG_TIMEOUT);
	}

	describe('.start', function(){

		it('is callable', function(){
			debug.assert(nopg).is('function');
			debug.assert(nopg.start).is('function');
		});

	});

	describe('test of', function() {

		it('typeless document creation', function(){
			return nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
				var doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('null');
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('null');

					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		it('typed document creation', function(){
			return nopg.start(PGCONFIG).createType("Test")({"$schema":{"type":"object"}}).create("Test")({"hello":"world"}).then(function(db) {
				var type = db.fetch();

				try {
					debug.assert(type).is('object');
					debug.assert(type.$events).is('object');
					debug.assert(type.$id).is('uuid');
					debug.assert(type.$name).is('string').equals("Test");
					debug.assert(type.$schema).is('object');
					//debug.assert(type.$validator).is('function');
					debug.assert(type.$meta).is('object');
					debug.assert(type.$created).is('date string');
					debug.assert(type.$modified).is('date string');

					debug.assert( Object.keys(type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				var doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('uuid').equals(type.$id);
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('string').equals('Test');

					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		it('typeless document partial update by document object', function(){
			var doc;
			return nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
				doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('null');
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('null');
					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.update(doc, {"hello2": "another"});
			}).then(function(db) {
				var doc2 = db.fetch();

				try {
					debug.assert(doc2).is('object');
					debug.assert(doc2.hello).is('string').equals('world');
					debug.assert(doc2.hello2).is('string').equals('another');
					debug.assert(doc2.$events).is('object');
					debug.assert(doc2.$id).is('uuid').equals(doc.$id);
					debug.assert(doc2.$content).is('object');
					debug.assert(doc2.$types_id).is('null');
					debug.assert(doc2.$created).is('date string');
					debug.assert(doc2.$modified).is('date string');
					debug.assert(doc2.$type).is('null');

					debug.assert( Object.keys(doc).filter(not_in(['hello', 'hello2', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc2 = ', doc2);
					throw e;
				}

				return db.commit();
			});
		});

		it('typeless document update by chaining object', function(){
			var doc;
			return nopg.start(PGCONFIG).create()({"foo":123, "hello":"world"}).then(function(db) {
				doc = db.fetch();

				doc.hello = "another";
				doc.hello2 = "world";
				delete doc.foo;

				try {
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.update(doc);
			}).then(function(db) {
				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'another');
					assert.strictEqual(doc.hello2, 'world');
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}
				return db.commit();
			});
		});

		it('typeless document deletion', function(){
			var doc;
			return nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
				doc = db.fetch();
				return db.del(doc);
			}).then(function(db) {
				// FIXME: Test that the doc was really deleted.
				return db.commit();
			});
		});

		it('typeless document search by property', function(){
			return nopg.start(PGCONFIG).create()({"hello":"UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT"}).then(function(db) {
				var doc = db.fetch();

				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT');
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.search()({"hello":"UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT"});
			}).then(function(db) {
				var items = db.fetch();

				try {
					assert.strictEqual(items.length, 1);
				} catch(e) {
					debug.log('items = ', items);
					throw e;
				}

				var doc = items.shift();

				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT');
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		it('typeless document search by document ID', function(){
			var id;
			return nopg.start(PGCONFIG).create()({"hello":"AF82RqSsXM527S3PGK76r6H3xjWqnYgP"}).then(function(db) {
				//debug.log('db is ', db);
				var doc = db.fetch();

				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'AF82RqSsXM527S3PGK76r6H3xjWqnYgP');
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				id = doc.$id;

				return db.search()({"$id":doc.$id});
			}).then(function(db) {
				var items = db.fetch();

				try {
					assert.strictEqual(items.length, 1);
				} catch(e) {
					debug.log('items = ', items);
					throw e;
				}

				var doc = items.shift();

				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'AF82RqSsXM527S3PGK76r6H3xjWqnYgP');
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		it('typed document search', function(){
			return nopg.start(PGCONFIG)
			  .createType("TestYmMGe0M6")()
			  .create("TestYmMGe0M6")({"foo":1})
			  .create("TestYmMGe0M6")({"foo":2})
			  .create("TestYmMGe0M6")({"foo":3})
			  .search("TestYmMGe0M6")()
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				try {
					assert.strictEqual(type.$name, "TestYmMGe0M6");
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				try {
					assert.strictEqual(item0.foo, 1);
				} catch(e) { debug.log('item0 = ', item0); throw e; }

				try {
					assert.strictEqual(item1.foo, 2);
				} catch(e) { debug.log('item1 = ', item1); throw e; }

				try {
					assert.strictEqual(item2.foo, 3);
				} catch(e) { debug.log('item2 = ', item2); throw e; }

				try {
					assert.strictEqual(items.length, 3);
					assert.strictEqual(item0.foo, items[0].foo);
					assert.strictEqual(item1.foo, items[1].foo);
					assert.strictEqual(item2.foo, items[2].foo);
				} catch(e) { debug.log('items = ', items); throw e; }

				return db.commit();
			});
		});

		it('typed document count', function(){
			return nopg.start(PGCONFIG)
			  .createType("Test_TypedDocCount")()
			  .create("Test_TypedDocCount")({"foo":1})
			  .create("Test_TypedDocCount")({"foo":2})
			  .create("Test_TypedDocCount")({"foo":3})
			  .count("Test_TypedDocCount")()
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				try {
					assert.strictEqual(type.$name, "Test_TypedDocCount");
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				try {
					assert.strictEqual(item0.foo, 1);
				} catch(e) { debug.log('item0 = ', item0); throw e; }

				try {
					assert.strictEqual(item1.foo, 2);
				} catch(e) { debug.log('item1 = ', item1); throw e; }

				try {
					assert.strictEqual(item2.foo, 3);
				} catch(e) { debug.log('item2 = ', item2); throw e; }

				try {
					assert.strictEqual(items, 3);
				} catch(e) { debug.log('items = ', items); throw e; }

				return db.commit();
			});
		});

		it('typed document search by property', function(){
			return nopg.start(PGCONFIG)
			  .createType("TestMxvLtb3x")()
			  .create("TestMxvLtb3x")({"foo":1,"bar":"foobar"})
			  .create("TestMxvLtb3x")({"foo":2,"bar":"hello"})
			  .create("TestMxvLtb3x")({"foo":3})
			  .search("TestMxvLtb3x")({"bar":"hello"})
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				try {
					assert.strictEqual(type.$name, "TestMxvLtb3x");
				} catch(e) { debug.log('type = ', type); throw e; }

				try {
					assert.strictEqual(item0.foo, 1);
					assert.strictEqual(item0.bar, "foobar");
				} catch(e) { debug.log('item0 = ', item0); throw e; }

				try {
					assert.strictEqual(item1.foo, 2);
					assert.strictEqual(item1.bar, "hello");
				} catch(e) { debug.log('item1 = ', item1); throw e; }

				try {
					assert.strictEqual(item2.foo, 3);
				} catch(e) { debug.log('item2 = ', item2); throw e; }

				try {
					assert.strictEqual(items.length, 1);
					assert.strictEqual(item1.foo, items[0].foo);
					assert.strictEqual(item1.bar, items[0].bar);
				} catch(e) { debug.log('items = ', items); throw e; }

				return db.commit();
			});
		});

		it('typed document search by selected property', function(){
			var type;
			return nopg.start(PGCONFIG)
			  .createType("Testg1KrHD2a")()
			  .then(function(db) {
				type = db.fetch();

				try {
					assert.strictEqual(type instanceof nopg.Type, true);
				} catch(e) { debug.log('type = ', type); throw e; }

				return db.create(type)({"foo":1,"bar":"foobar"})
				  .create(type)({"foo":2,"bar":"hello"})
				  .create(type)({"foo":3})
				  .search(type)({"bar":"hello"});
			  }).then(function(db) {
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				try {
					assert.strictEqual(type.$name, "Testg1KrHD2a");
				} catch(e) { debug.log('type = ', type); throw e; }

				try {
					assert.strictEqual(item0.foo, 1);
					assert.strictEqual(item0.bar, "foobar");
				} catch(e) { debug.log('item0 = ', item0); throw e; }

				try {
					assert.strictEqual(item1.bar, "hello");
					assert.strictEqual(item1.bar, "hello");
				} catch(e) { debug.log('item1 = ', item1); throw e; }

				try {
					assert.strictEqual(item2.foo, 3);
				} catch(e) { debug.log('item2 = ', item2); throw e; }

				try {
					assert.strictEqual(items.length, 1);
					assert.strictEqual(item1.foo, items[0].foo);
					assert.strictEqual(item1.bar, items[0].bar);
				} catch(e) { debug.log('items = ', items); throw e; }

				return db.commit();
			});
		});

		it('Creating unnamed types', function(){
			var type;
			return nopg.start(PGCONFIG)
			  .createType()()
			  .then(function(db) {
				type = db.fetch();

				try {
					assert.strictEqual(type instanceof nopg.Type, true);
				} catch(e) { debug.log('type = ', type); throw e; }

				return db.create(type)({"foo":1,"bar":"foobar"})
				  .create(type)({"foo":2,"bar":"hello"})
				  .create(type)({"foo":3})
				  .search(type)({"bar":"hello"});
			  }).then(function(db) {
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				try {
					assert.strictEqual(item0.foo, 1);
					assert.strictEqual(item0.bar, "foobar");
				} catch(e) { debug.log('item0 = ', item0); throw e; }

				try {
					assert.strictEqual(item1.foo, 2);
					assert.strictEqual(item1.bar, "hello");
				} catch(e) { debug.log('item1 = ', item1); throw e; }

				try {
					assert.strictEqual(item2.foo, 3);
				} catch(e) { debug.log('item2 = ', item2); throw e; }

				try {
					assert.strictEqual(items.length, 1);
					assert.strictEqual(item1.foo, items[0].foo);
					assert.strictEqual(item1.bar, items[0].bar);
				} catch(e) { debug.log('items = ', items); throw e; }

				return db.commit();
			});
		});

		it('Declare type works over existing type', function(){
			return nopg.start(PGCONFIG).createType("TypeXvsMtxJyWE")({"hello":"world1"}).declareType("TypeXvsMtxJyWE")({"hello":"world2"}).then(function(db) {
				//debug.log('db is ', db);
				var type1 = db.fetch();
				var type2 = db.fetch();

				try {
					assert.strictEqual(typeof type1, 'object');
					assert.strictEqual(typeof type1.hello, 'string');
					assert.strictEqual(type1.hello, 'world1');
				} catch(e) { debug.log('type1 = ', type1); throw e; }

				try {
					assert.strictEqual(typeof type2, 'object');
					assert.strictEqual(typeof type2.hello, 'string');
					assert.strictEqual(type2.hello, 'world2');
				} catch(e) { debug.log('type2 = ', type2); throw e; }

				try {
					assert.strictEqual(type1.$id, type2.$id);
				} catch(e) {
					debug.log('type1 = ', type1);
					debug.log('type2 = ', type2);
					throw e;
				}

				return db.commit();
			});
		});

		it('Declare type works even if type does not exist', function(){
			return nopg.start(PGCONFIG).declareType("Type4UJHIRRiCc")({"hello":"world"}).then(function(db) {
				//debug.log('db is ', db);
				var type1 = db.fetch();

				try {
					assert.strictEqual(typeof type1, 'object');
					assert.strictEqual(typeof type1.hello, 'string');
					assert.strictEqual(type1.hello, 'world');
				} catch(e) { debug.log('type1 = ', type1); throw e; }

				return db.commit();
			});
		});

		it('Types with schema', function(){
			return nopg.start(PGCONFIG).declareType("TypeSession4UJHIRRiCc")({"$schema":{"type":"object"}}).then(function(db) {
				//debug.log('db is ', db);
				var type1 = db.fetch();
				try {
					assert.strictEqual(typeof type1, 'object');
					assert.strictEqual(typeof type1.$schema, 'object');
					assert.strictEqual(type1.$schema.type, 'object');
				} catch(e) { debug.log('type1 = ', type1); throw e; }
				return db.commit();
			});
		});

		it('Deleting types', function(){
			var type, exists;
			return nopg.start(PGCONFIG).createType("DeleteTypeTestsxWH8QiBYc")({"hello":"world"}).then(function(db) {
				type = db.fetch();
				//debug.log('type = ' + util.inspect(type));
				return db.del(type).commit();
			}).then(function() {
				return nopg.start(PGCONFIG).typeExists("DeleteTypeTestsxWH8QiBYc").commit();
			}).then(function(db) {
				exists = db.fetch();
				try {
					assert.strictEqual(typeof exists, 'boolean');
					assert.strictEqual(exists, false);
				} catch(e) { debug.log('exists = ', exists); throw e; }
				return db;
			});
		});

		it('Types with schema do not allow bad data', function(){
			var type;
			return nopg.start(PGCONFIG).createType("SchemaTest_2y78")({
				"$schema": {
					"title": "Point Object",
					"type": "object",
					"properties": {
						"x": {"type": "number"},
						"y": {"type": "number"}
					},
					"required": ["x", "y"]
				}
			}).then(function(db) {
				type = db.fetch();
				//debug.log('type = ' + util.inspect(type));
				return db.create(type)({"x":10, "y":20});
			}).then(function(db) {
				var point = db.fetch();

				try {
					assert.strictEqual(typeof point.x, 'number');
					assert.strictEqual(typeof point.y, 'number');
					assert.strictEqual(point.x, 10);
					assert.strictEqual(point.y, 20);
				} catch(e) { debug.log('point = ', point); throw e; }

				var failed;
				return db.create(type)({"x":10}).fail(function(err) {
					try {
						var err_str = ''+err;
						debug.assert( err_str.substr( err_str.indexOf('ValidationError:') ) ).equals('ValidationError: Missing required property: y');
					} catch(e) {
						debug.log("Expected error, but message was not expected: " + err);
						throw e;
					}
					failed = true;
				}).fin(function() {
					assert.strictEqual(failed, true);
				}).then(function() {
					return db;
				});
			}).then(function(db) {
				return db.commit();
			});
		});

		/* */
		it('Types with validator do not allow wrong data', function(){
			var type;
			return nopg.start(PGCONFIG).createType("ValidatorTest_3esH")({
				"$schema": {
					"title": "Point Object",
					"type": "object",
					"properties": {
						"x": {"type": "number"},
						"y": {"type": "number"}
					},
					"required": ["x", "y"]
				},
				"$validator": function(o) {
					if( o && o.x && o.y && (o.x >= 0) && (o.x < 100) && (o.y >= 0) && (o.y < 100) ) {
						return true;
					}
					return false;
				}
			}).then(function(db) {
				type = db.fetch();
				//debug.log('type = ' + util.inspect(type));
				return db.create(type)({"x":10, "y":20});
			}).then(function(db) {
				var point = db.fetch();

				try {
					assert.strictEqual(typeof point.x, 'number');
					assert.strictEqual(typeof point.y, 'number');
					assert.strictEqual(point.x, 10);
					assert.strictEqual(point.y, 20);
				} catch(e) { debug.log('point = ', point); throw e; }

				var failed = false;
				return db.create(type)({"x":200, "y":200}).fail(function(err) {
					try {
						var err_str = ''+err;
						debug.assert( err_str.substr( err_str.indexOf('failed custom type check'), 24) ).equals('failed custom type check');
					} catch(e) {
						debug.log("Expected error, but message was not expected: " + err);
						throw e;
					}
					failed = true;
				}).fin(function() {
					assert.strictEqual(failed, true);
				}).then(function() {
					return db;
				});
			}).then(function(db) {
				return db.commit();
			});
		});

		it('Editing types by changing object', function(){
			var type, type2;
			return nopg.start(PGCONFIG).createType("EditTypeTest_VGM3")({"hello":"world"}).then(function(db) {
				type = db.fetch();

				try {
					assert.strictEqual(typeof type, 'object');
					assert.strictEqual(type instanceof nopg.Type, true);
					assert.strictEqual(type.hello, 'world');
				} catch(e) { debug.log('type = ', type); throw e; }

				type.hello = 'something else';

				return db.update(type).commit();
			}).then(function() {
				return nopg.start(PGCONFIG).getType("EditTypeTest_VGM3").commit();
			}).then(function(db) {
				type2 = db.fetch();
				try {
					assert.strictEqual(typeof type2, 'object');
					assert.strictEqual(type2 instanceof nopg.Type, true);
					assert.strictEqual(type2.$id, type.$id);
					assert.strictEqual(type2.hello, 'something else');
				} catch(e) { debug.log('type2 = ', type2); throw e; }
			});
		});

		it('Partial updating of types', function(){
			var type, type2;
			return nopg.start(PGCONFIG).createType("EditTypeTest2_5Vmf")({"hello":"world"}).then(function(db) {
				type = db.fetch();

				try {
					assert.strictEqual(typeof type, 'object');
					assert.strictEqual(type instanceof nopg.Type, true);
					assert.strictEqual(type.hello, 'world');
				} catch(e) { debug.log('type = ', type); throw e; }

				return db.update(type, {'hello2':'something else'}).commit();
			}).then(function() {
				return nopg.start(PGCONFIG).getType("EditTypeTest2_5Vmf").commit();
			}).then(function(db) {
				type2 = db.fetch();

				try {
					assert.strictEqual(typeof type2, 'object');
					assert.strictEqual(type2 instanceof nopg.Type, true);
					assert.strictEqual(type2.hello, 'world');

					assert.strictEqual(typeof type2, 'object');
					assert.strictEqual(type2 instanceof nopg.Type, true);
					assert.strictEqual(type2.$id, type.$id);
					assert.strictEqual(type2.hello2, 'something else');
				} catch(e) { debug.log('type2 = ', type2); throw e; }

			});
		});

		it('partial update of typed document', function(){
			var doc;
			return nopg.start(PGCONFIG).createType("Test-hSYX")({"$schema":{"type":"object"}}).create("Test-hSYX")({"hello":"world"}).then(function(db) {
				var type = db.fetch();
				doc = db.fetch();
				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'world');
				} catch(e) { debug.log('doc = ', doc); throw e; }
				return db.update(doc, {"hello2": "world2"});
			}).then(function(db) {
				return db.getDocument({'$id':doc.$id});
			}).then(function(db) {
				var doc2 = db.fetch();

				try {
					assert.strictEqual(typeof doc2.hello, 'string');
					assert.strictEqual(doc2.hello, 'world');

					assert.strictEqual(typeof doc2.hello2, 'string');
					assert.strictEqual(doc2.hello2, 'world2');
				} catch(e) { debug.log('doc2 = ', doc2); throw e; }

				return db.commit();
			});
		});

		it('partial update of typed document without any real changes', function(){
			var doc;
			return nopg.start(PGCONFIG).createType("Test-mtm8")({"$schema":{"type":"object"}}).create("Test-mtm8")({"hello":"world"}).then(function(db) {
				var type = db.fetch();
				doc = db.fetch();
				try {
					assert.strictEqual(typeof doc.hello, 'string');
					assert.strictEqual(doc.hello, 'world');
				} catch(e) { debug.log('doc = ', doc); throw e; }

				return db.update(doc, {"hello": "world"});
			}).then(function(db) {
				return db.getDocument({'$id':doc.$id});
			}).then(function(db) {
				var doc2 = db.fetch();

				try {
					assert.strictEqual(typeof doc2.hello, 'string');
					assert.strictEqual(doc2.hello, 'world');
				} catch(e) { debug.log('doc2 = ', doc2); throw e; }

				return db.commit();
			});
		});

		it('can create document with attachments', function(){
			var doc;
			return nopg.start(PGCONFIG)
			    .createType("Test-6pvY")({"$schema":{"type":"object"}})
			    .create("Test-6pvY")({"hello":"world"})
			    .createAttachment()( __dirname + '/files/test1.jpg')
			    .createAttachment()( __dirname + '/files/test2.jpg', {"foo":"bar"})
				.then(function(db) {

				var type = db.fetch();
				var doc = db.fetch();
				var att1 = db.fetch();
				var att2 = db.fetch();

				try {
					debug.assert(type).typeOf('object').instanceOf(nopg.Type);
				} catch(e) { debug.log('type = ', type); throw e; }

				try {
					debug.assert(doc).typeOf('object').instanceOf(nopg.Document);
				} catch(e) { debug.log('doc = ', doc); throw e; }

				try {
					debug.assert(att1).typeOf('object').instanceOf(nopg.Attachment);
					assert.strictEqual(att1.$documents_id, doc.$id);
				} catch(e) { debug.log('att1 = ', att1); throw e; }

				try {
					debug.assert(att2).typeOf('object').instanceOf(nopg.Attachment);
					assert.strictEqual(att2.$documents_id, doc.$id);
					assert.strictEqual(att2.foo, "bar");
				} catch(e) { debug.log('att2 = ', att2); throw e; }

				var att1_buffer = att1.getBuffer();
				var att2_buffer = att2.getBuffer();

				//debug.log("att1_buffer.length = ", att1_buffer.length);
				//debug.log("att2_buffer.length = ", att2_buffer.length);

				var att1_hash = crypto.createHash('md5').update( att1_buffer ).digest('hex');
				var att2_hash = crypto.createHash('md5').update( att2_buffer ).digest('hex');

				//debug.log("att1_hash = ", att1_hash);
				//debug.log("att2_hash = ", att2_hash);

				try {
					assert.strictEqual(att1_hash, "43e9b43ddebe7cee7fff8e46d258c67f");
				} catch(e) { debug.log('att1_hash = ', att1_hash); throw e; }

				try {
					assert.strictEqual(att2_hash, "7e87855080a7eb8b8dd4a06122fccb44");
				} catch(e) { debug.log('att2_hash = ', att2_hash); throw e; }

				return db.commit();
			});
		});

		it('can create document with attachments from buffer', function(){
			var doc;
			//var buffer;
			return _Q.fcall(function() {
				return fs.readFile( __dirname + '/files/test1.jpg'/*, {'encoding':'hex'}*/ );
			}).then(function(buffer) {

				debug.assert(buffer).typeOf('object').instanceOf(Buffer);

				nopg.start(PGCONFIG)
				    .createType("Test-W3tE")({"$schema":{"type":"object"}})
				    .create("Test-W3tE")({"hello":"world"})
				    .createAttachment()(buffer)
					.then(function(db) {

					var type = db.fetch();
					var doc = db.fetch();
					var att1 = db.fetch();

					debug.assert(type).typeOf('object').instanceOf(nopg.Type);
					debug.assert(doc).typeOf('object').instanceOf(nopg.Document);
					debug.assert(att1).typeOf('object').instanceOf(nopg.Attachment);

					assert.strictEqual(att1.$documents_id, doc.$id);

					var att1_buffer = att1.getBuffer();

					debug.assert(att1_buffer).typeOf('object').instanceOf(Buffer);

					//debug.log("att1_buffer.length = ", att1_buffer.length);

					var att1_hash = crypto.createHash('md5').update( att1_buffer ).digest('hex');

					try {
						assert.strictEqual(att1_hash, "43e9b43ddebe7cee7fff8e46d258c67f");
					} catch(e) { debug.log('att1_hash = ', att1_hash); throw e; }

					return db.commit();
				});
			});
		});

		it('can list document with attachments', function(){
			var doc;
			return nopg.start(PGCONFIG)
			    .createType("Test-0qBe")({"$schema":{"type":"object"}})
			    .create("Test-0qBe")({"hello":"world"})
			    .createAttachment()( __dirname + '/files/test1.jpg')
			    .createAttachment()( __dirname + '/files/test2.jpg', {"foo":"bar"})
			    .searchAttachments()()
				.then(function(db) {

				var type = db.fetch();
				var doc = db.fetch();
				var att1 = db.fetch();
				var att2 = db.fetch();
				var atts = db.fetch();

				debug.assert(type).typeOf('object').instanceOf(nopg.Type);
				debug.assert(doc).typeOf('object').instanceOf(nopg.Document);
				debug.assert(att1).typeOf('object').instanceOf(nopg.Attachment);
				debug.assert(att2).typeOf('object').instanceOf(nopg.Attachment);
				debug.assert(atts).typeOf('object').instanceOf(Array);

				assert.strictEqual(att1.$documents_id, doc.$id);
				assert.strictEqual(att2.$documents_id, doc.$id);
				assert.strictEqual(att2.foo, "bar");

				var att1_buffer = att1.getBuffer();
				var att2_buffer = att2.getBuffer();
				var atts_buffers = atts.map(function(a) { return a.getBuffer(); });

				//debug.log("att1_buffer.length = ", att1_buffer.length);
				//debug.log("att2_buffer.length = ", att2_buffer.length);

				var att1_hash = crypto.createHash('md5').update( att1_buffer ).digest('hex');
				var att2_hash = crypto.createHash('md5').update( att2_buffer ).digest('hex');
				var atts_hashes = atts_buffers.map(function(a) { return crypto.createHash('md5').update( a ).digest('hex'); });

				//debug.log("att1_hash = ", att1_hash);
				//debug.log("att2_hash = ", att2_hash);

				assert.strictEqual(att1_hash, "43e9b43ddebe7cee7fff8e46d258c67f");
				assert.strictEqual(att2_hash, "7e87855080a7eb8b8dd4a06122fccb44");

				assert.strictEqual(atts_hashes[0], "43e9b43ddebe7cee7fff8e46d258c67f");
				assert.strictEqual(atts_hashes[1], "7e87855080a7eb8b8dd4a06122fccb44");

				return db.commit();
			});
		});

		it('typed document search by properties with any match', function(){
			return nopg.start(PGCONFIG)
			  .createType("TestdtIWxj5c")()
			  .create("TestdtIWxj5c")({"foo":1,"bar":"foobar"})
			  .create("TestdtIWxj5c")({"foo":2,"bar":"hello"})
			  .create("TestdtIWxj5c")({"foo":3})
			  .search("TestdtIWxj5c")({"bar":"hello", "foo":1}, {"match":"any"})
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				assert.strictEqual(type.$name, "TestdtIWxj5c");

				assert.strictEqual(item0.foo, 1);
				assert.strictEqual(item0.bar, "foobar");
				assert.strictEqual(item1.bar, "hello");
				assert.strictEqual(item1.bar, "hello");
				assert.strictEqual(item2.foo, 3);

				assert.strictEqual(items.length, 2);

				assert.strictEqual(item0.foo, items[0].foo);
				assert.strictEqual(item0.bar, items[0].bar);

				assert.strictEqual(item1.foo, items[1].foo);
				assert.strictEqual(item1.bar, items[1].bar);

				return db.commit();
			});
		});

		it('typed document search by properties with order', function(){
			return nopg.start(PGCONFIG)
			  .createType("Testj0LidL")()
			  .create("Testj0LidL")({"foo":"Hello"})
			  .create("Testj0LidL")({"foo":"Bar"})
			  .create("Testj0LidL")({"foo":"World"})
			  .search("Testj0LidL")(undefined, {"order":"foo"})
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				assert.strictEqual(type.$name, "Testj0LidL");

				assert.strictEqual(item0.foo, "Hello");
				assert.strictEqual(item1.foo, "Bar");
				assert.strictEqual(item2.foo, "World");

				assert.strictEqual(items.length, 3);

				assert.strictEqual(item1.foo, items[0].foo);
				assert.strictEqual(item0.foo, items[1].foo);
				assert.strictEqual(item2.foo, items[2].foo);

				return db.commit();
			});
		});

		it('typed document search by properties with array logic', function(){
			return nopg.start(PGCONFIG)
			  .createType("TestAATxICz0")()
			  .create("TestAATxICz0")({"index":1,"bar":"foobar"})
			  .create("TestAATxICz0")({"index":2,"bar":"hello"})
			  .create("TestAATxICz0")({"index":3})
			  .create("TestAATxICz0")({"index":4,"bar":"foo"})
			  .create("TestAATxICz0")({"index":5,"bar":"hello"})
			  .search("TestAATxICz0")(["OR", {"index":3}, ["AND", {"bar":"hello"}, {"index":5}]])
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var item3 = db.fetch();
				var item4 = db.fetch();
				var items = db.fetch();

				assert.strictEqual(type.$name, "TestAATxICz0");


				assert.strictEqual(item0.index, 1);
				assert.strictEqual(item0.bar, "foobar");

				assert.strictEqual(item1.index, 2);
				assert.strictEqual(item1.bar, "hello");

				assert.strictEqual(item2.index, 3);

				assert.strictEqual(item3.index, 4);
				assert.strictEqual(item3.bar, "foo");

				assert.strictEqual(item4.index, 5);
				assert.strictEqual(item4.bar, "hello");

				assert.strictEqual(items.length, 2);

				assert.strictEqual(item2.index, items[0].index);

				assert.strictEqual(item4.index, items[1].index);
				assert.strictEqual(item4.bar, items[1].bar);

				return db.commit();
			});
		});

		it('typed document search with selected fields', function(){
			return nopg.start(PGCONFIG)
			  .createType("TestIjvIqtC1")()
			  .create("TestIjvIqtC1")({"foo":1,"bar":"hello"})
			  .create("TestIjvIqtC1")({"foo":2,"bar":"hello"})
			  .create("TestIjvIqtC1")({"foo":3})
			  .search("TestIjvIqtC1")({"bar":"hello"}, {'fields': ['foo'] })
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				assert.strictEqual(type.$name, "TestIjvIqtC1");

				assert.strictEqual(item0.foo, 1);
				assert.strictEqual(item0.bar, "hello");

				assert.strictEqual(item1.foo, 2);
				assert.strictEqual(item1.bar, "hello");

				assert.strictEqual(item2.foo, 3);
				assert.strictEqual(item2.bar, undefined);

				assert.strictEqual(items.length, 2);

				assert.strictEqual(items[0].foo, 1);
				assert.strictEqual(items[0].bar, undefined);

				assert.strictEqual(items[1].foo, 2);
				assert.strictEqual(items[1].bar, undefined);

				return db.commit();
			});
		});

		/* */
		it('typed document search using custom function', function(){
			return nopg.start(PGCONFIG)
			  .createType("Test2jiArvj8")()
			  .create("Test2jiArvj8")({"foo":1})
			  .create("Test2jiArvj8")({"foo":2})
			  .create("Test2jiArvj8")({"foo":3})
			  .search("Test2jiArvj8")(["BIND", "foo", function(foo, limit) { return foo >= limit; }, 2])
			  .then(function(db) {
				var type = db.fetch();
				var item0 = db.fetch();
				var item1 = db.fetch();
				var item2 = db.fetch();
				var items = db.fetch();

				debug.log('items = ', items);

				assert.strictEqual(type.$name, "Test2jiArvj8");

				assert.strictEqual(item0.foo, 1);
				assert.strictEqual(item1.foo, 2);
				assert.strictEqual(item2.foo, 3);

				assert.strictEqual(items.length, 2);

				// There is a possibility that .create() might create these with the same timestamp, and default time based ordering would not work.
				if(items[0].foo === 2) {
					assert.strictEqual(items[0].foo, 2);
					assert.strictEqual(items[1].foo, 3);
				} else {
					assert.strictEqual(items[0].foo, 3);
					assert.strictEqual(items[1].foo, 2);
				}

				return db.commit();
			});
		});

		/** */
		it('typed document creation and single fetching by ID', function(){
			var type;
			return nopg.start(PGCONFIG).createType("TestQgBYjQsQ")({"$schema":{"type":"object"}}).create("TestQgBYjQsQ")({"hello":"world"}).then(function(db) {
				type = db.fetch();

				try {
					debug.assert(type).is('object');
					debug.assert(type.$events).is('object');
					debug.assert(type.$id).is('uuid');
					debug.assert(type.$name).is('string').equals("TestQgBYjQsQ");
					debug.assert(type.$schema).is('object');
					//debug.assert(type.$validator).is('function');
					debug.assert(type.$meta).is('object');
					debug.assert(type.$created).is('date string');
					debug.assert(type.$modified).is('date string');

					debug.assert( Object.keys(type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				var doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('uuid').equals(type.$id);
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('string').equals('TestQgBYjQsQ');

					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.searchSingle('TestQgBYjQsQ')({'$id': doc.$id});
			}).then(function(db) {
				var doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('uuid').equals(type.$id);
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('string').equals('TestQgBYjQsQ');

					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		/** */
		it('typed document creation and single fetching by ID with field list', function(){
			var type;
			return nopg.start(PGCONFIG).createType("TestgJBvMX")({"$schema":{"type":"object"}}).create("TestgJBvMX")({"hello":"world"}).then(function(db) {
				type = db.fetch();

				try {
					debug.assert(type).is('object');
					debug.assert(type.$events).is('object');
					debug.assert(type.$id).is('uuid');
					debug.assert(type.$name).is('string').equals("TestgJBvMX");
					debug.assert(type.$schema).is('object');
					//debug.assert(type.$validator).is('function');
					debug.assert(type.$meta).is('object');
					debug.assert(type.$created).is('date string');
					debug.assert(type.$modified).is('date string');

					debug.assert( Object.keys(type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				var doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('uuid').equals(type.$id);
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('string').equals('TestgJBvMX');

					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.searchSingle('TestgJBvMX')({'$id': doc.$id}, {'fields': ['$id', '$content', '$types_id', '$created', '$modified', '$type']});
			}).then(function(db) {
				var doc = db.fetch();

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('uuid').equals(type.$id);
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('string').equals('TestgJBvMX');

					debug.assert( Object.keys(doc).filter(not_in(['hello', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		/** */
		it('fetching related documents', function(){
			var user_type, group_type, group;
			return nopg.start(PGCONFIG)
			 .createType("Testmoccpt_user")({
				"$schema":{
					"type":"object",
					"properties": {
						"name": {"type": "string"},
						"group": {"type": "string"}
					}
				}//,
				//'relations': {
				//	'group': 'Testmoccpt_group'
				//}
			 })
			 .createType("Testmoccpt_group")({
				"$schema":{
					"type": "object",
					"properties": {
						"name": {"type": "string"}
					}
				}
			 })
			 .create("Testmoccpt_group")({"name":"Users"})
			 .then(function(db) {
				user_type = db.fetch();

				try {
					debug.assert(user_type).is('object');
					debug.assert(user_type.$events).is('object');
					debug.assert(user_type.$id).is('uuid');
					debug.assert(user_type.$name).is('string').equals("Testmoccpt_user");
					debug.assert(user_type.$schema).is('object');
					//debug.assert(user_type.$validator).is('function');
					debug.assert(user_type.$meta).is('object');
					debug.assert(user_type.$created).is('date string');
					debug.assert(user_type.$modified).is('date string');

					debug.assert( Object.keys(user_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user_type = ', user_type);
					throw e;
				}

				group_type = db.fetch();

				try {
					debug.assert(group_type).is('object');
					debug.assert(group_type.$events).is('object');
					debug.assert(group_type.$id).is('uuid');
					debug.assert(group_type.$name).is('string').equals("Testmoccpt_group");
					debug.assert(group_type.$schema).is('object');
					//debug.assert(group_type.$validator).is('function');
					debug.assert(group_type.$meta).is('object');
					debug.assert(group_type.$created).is('date string');
					debug.assert(group_type.$modified).is('date string');

					debug.assert( Object.keys(group_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group_type = ', group_type);
					throw e;
				}

				group = db.fetch();

				try {
					debug.assert(group).is('object');
					debug.assert(group.name).is('string').equals('Users');
					debug.assert(group.$events).is('object');
					debug.assert(group.$id).is('uuid');
					debug.assert(group.$content).is('object');
					debug.assert(group.$types_id).is('uuid').equals(group_type.$id);
					debug.assert(group.$created).is('date string');
					debug.assert(group.$modified).is('date string');
					debug.assert(group.$type).is('string').equals('Testmoccpt_group');

					debug.assert( Object.keys(group).filter(not_in(['name', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group = ', group);
					throw e;
				}

				return db.create('Testmoccpt_user')({'name': 'foobar', 'group': group.$id});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Testmoccpt_user');

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}


				return db.searchSingle('Testmoccpt_user')({'$id': user.$id}, {
					'documents': ['group']
				});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Testmoccpt_user');

					debug.assert(user.$documents).is('object');

					try {
						debug.assert(user.$documents[user.group]).is('object');
						debug.assert(user.$documents[user.group].name).is('string').equals('Users');
						debug.assert(user.$documents[user.group].$events).is('object');
						debug.assert(user.$documents[user.group].$id).is('uuid');
						debug.assert(user.$documents[user.group].$content).is('object');
						debug.assert(user.$documents[user.group].$types_id).is('uuid').equals(group_type.$id);
						debug.assert(user.$documents[user.group].$created).is('date string');
						debug.assert(user.$documents[user.group].$modified).is('date string');
						debug.assert(user.$documents[user.group].$type).is('string').equals('Testmoccpt_group');

						debug.assert( Object.keys(user.$documents[user.group]).filter(not_in(['name', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
					} catch(e) {
						debug.log('user.$documents[user.group] = ', user.$documents[user.group]);
						throw e;
					}

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type', '$documents'])) ).is('array').length(0);

				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}

				return db.commit();
			});
		});

		/** */
		it('fetching related documents by type', function(){
			var user_type, group_type, group;
			return nopg.start(PGCONFIG)
			 .createType("Testfrdocbt_user")({
				"$schema":{
					"type":"object",
					"properties": {
						"name": {"type": "string"},
						"group": {"type": "string"}
					}
				}//,
				//'relations': {
				//	'group': 'Testfrdocbt_group'
				//}
			 })
			 .createType("Testfrdocbt_group")({
				"$schema":{
					"type": "object",
					"properties": {
						"name": {"type": "string"}
					}
				}
			 })
			 .create("Testfrdocbt_group")({"name":"Users"})
			 .then(function(db) {
				user_type = db.fetch();

				try {
					debug.assert(user_type).is('object');
					debug.assert(user_type.$events).is('object');
					debug.assert(user_type.$id).is('uuid');
					debug.assert(user_type.$name).is('string').equals("Testfrdocbt_user");
					debug.assert(user_type.$schema).is('object');
					//debug.assert(user_type.$validator).is('function');
					debug.assert(user_type.$meta).is('object');
					debug.assert(user_type.$created).is('date string');
					debug.assert(user_type.$modified).is('date string');

					debug.assert( Object.keys(user_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'/*, 'relations'*/])) ).is('array').length(0);
				} catch(e) {
					debug.log('user_type = ', user_type);
					throw e;
				}

				group_type = db.fetch();

				try {
					debug.assert(group_type).is('object');
					debug.assert(group_type.$events).is('object');
					debug.assert(group_type.$id).is('uuid');
					debug.assert(group_type.$name).is('string').equals("Testfrdocbt_group");
					debug.assert(group_type.$schema).is('object');
					//debug.assert(group_type.$validator).is('function');
					debug.assert(group_type.$meta).is('object');
					debug.assert(group_type.$created).is('date string');
					debug.assert(group_type.$modified).is('date string');

					debug.assert( Object.keys(group_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group_type = ', group_type);
					throw e;
				}

				group = db.fetch();

				try {
					debug.assert(group).is('object');
					debug.assert(group.name).is('string').equals('Users');
					debug.assert(group.$events).is('object');
					debug.assert(group.$id).is('uuid');
					debug.assert(group.$content).is('object');
					debug.assert(group.$types_id).is('uuid').equals(group_type.$id);
					debug.assert(group.$created).is('date string');
					debug.assert(group.$modified).is('date string');
					debug.assert(group.$type).is('string').equals('Testfrdocbt_group');

					debug.assert( Object.keys(group).filter(not_in(['name', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group = ', group);
					throw e;
				}

				return db.create('Testfrdocbt_user')({'name': 'foobar', 'group': group.$id});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Testfrdocbt_user');

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}


				return db.searchSingle('Testfrdocbt_user')({'$id': user.$id}, {
					'documents': ['Testfrdocbt_group#group']
				});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Testfrdocbt_user');

					debug.assert(user.$documents).is('object');

					try {
						debug.assert(user.$documents[user.group]).is('object');
						debug.assert(user.$documents[user.group].name).is('string').equals('Users');
						debug.assert(user.$documents[user.group].$events).is('object');
						debug.assert(user.$documents[user.group].$id).is('uuid');
						debug.assert(user.$documents[user.group].$content).is('object');
						debug.assert(user.$documents[user.group].$types_id).is('uuid').equals(group_type.$id);
						debug.assert(user.$documents[user.group].$created).is('date string');
						debug.assert(user.$documents[user.group].$modified).is('date string');
						debug.assert(user.$documents[user.group].$type).is('string').equals('Testfrdocbt_group');

						debug.assert( Object.keys(user.$documents[user.group]).filter(not_in(['name', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
					} catch(e) {
						debug.log('user.$documents[user.group] = ', user.$documents[user.group]);
						throw e;
					}

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type', '$documents'])) ).is('array').length(0);

				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}

				return db.commit();
			});
		});

		/** */
		it('fetching related documents with field list', function(){
			var user_type, group_type, group;
			return nopg.start(PGCONFIG)
			 .createType("Test_TyWXGCr_user")({
				"$schema":{
					"type":"object",
					"properties": {
						"name": {"type": "string"},
						"group": {"type": "string"},
						"email": {"type": "string"},
						"password": {"type": "string"},
						"sort_order": {"type": "number"}
					}
				}//,
				//'relations': {
				//	'group': 'Test_TyWXGCr_group',
				//}
			 })
			 .createType("Test_TyWXGCr_group")({
				"$schema":{
					"type": "object",
					"properties": {
						"name": {"type": "string"},
						"password": {"type": "string"},
						"sort_order": {"type": "number"}
					}
				}
			 })
			 .create("Test_TyWXGCr_group")({"name":"Users", "password": "secret", "sort_order": 10})
			 .then(function(db) {
				user_type = db.fetch();

				try {
					debug.assert(user_type).is('object');
					debug.assert(user_type.$events).is('object');
					debug.assert(user_type.$id).is('uuid');
					debug.assert(user_type.$name).is('string').equals("Test_TyWXGCr_user");
					debug.assert(user_type.$schema).is('object');
					//debug.assert(user_type.$validator).is('function');
					debug.assert(user_type.$meta).is('object');
					debug.assert(user_type.$created).is('date string');
					debug.assert(user_type.$modified).is('date string');

					debug.assert( Object.keys(user_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'/*, 'relations'*/])) ).is('array').length(0);
				} catch(e) {
					debug.log('user_type = ', user_type);
					throw e;
				}

				group_type = db.fetch();

				try {
					debug.assert(group_type).is('object');
					debug.assert(group_type.$events).is('object');
					debug.assert(group_type.$id).is('uuid');
					debug.assert(group_type.$name).is('string').equals("Test_TyWXGCr_group");
					debug.assert(group_type.$schema).is('object');
					//debug.assert(group_type.$validator).is('function');
					debug.assert(group_type.$meta).is('object');
					debug.assert(group_type.$created).is('date string');
					debug.assert(group_type.$modified).is('date string');

					debug.assert( Object.keys(group_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group_type = ', group_type);
					throw e;
				}

				group = db.fetch();

				try {
					debug.assert(group).is('object');
					debug.assert(group.name).is('string').equals('Users');
					debug.assert(group.password).is('string').equals('secret');
					debug.assert(group.sort_order).is('number').equals(10);
					debug.assert(group.$events).is('object');
					debug.assert(group.$id).is('uuid');
					debug.assert(group.$content).is('object');
					debug.assert(group.$types_id).is('uuid').equals(group_type.$id);
					debug.assert(group.$created).is('date string');
					debug.assert(group.$modified).is('date string');
					debug.assert(group.$type).is('string').equals('Test_TyWXGCr_group');

					debug.assert( Object.keys(group).filter(not_in(['name', 'password', 'sort_order', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group = ', group);
					throw e;
				}

				return db.create('Test_TyWXGCr_user')({'name': 'foobar', 'group': group.$id, 'email': 'foobar@example.com', 'sort_order': 1000, 'password': 'secret1234'});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.email).is('string').equals('foobar@example.com');
					debug.assert(user.password).is('string').equals('secret1234');
					debug.assert(user.sort_order).is('number').equals(1000);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Test_TyWXGCr_user');

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', 'email', 'password', 'sort_order', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}

				return db.searchSingle('Test_TyWXGCr_user')({'$id': user.$id}, {
					'documents': ['group|$id,$type,$types_id,name,sort_order']
				});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Test_TyWXGCr_user');

					debug.assert(user.$documents).is('object');

					try {
						debug.assert(user.$documents[user.group]).is('object');
						debug.assert(user.$documents[user.group].name).is('string').equals('Users');
						debug.assert(user.$documents[user.group].sort_order).is('number').equals(10);
						debug.assert(user.$documents[user.group].password).is('undefined');
						debug.assert(user.$documents[user.group].email).is('undefined');
						debug.assert(user.$documents[user.group].$events).is('object');
						debug.assert(user.$documents[user.group].$id).is('uuid');
						debug.assert(user.$documents[user.group].$content).is('object');
						debug.assert(user.$documents[user.group].$type).is('string').equals('Test_TyWXGCr_group');
						debug.assert(user.$documents[user.group].$types_id).is('uuid').equals(group_type.$id);
						//debug.assert(user.$documents[user.group].$created).is('date string');
						//debug.assert(user.$documents[user.group].$modified).is('date string');

						debug.assert( Object.keys(user.$documents[user.group]).filter(not_in(['name', 'sort_order', '$events', '$id', '$content', '$types_id', '$type' /*, '$created', '$modified'*/])) ).is('array').length(0);
					} catch(e) {
						debug.log('user.$documents[user.group] = ', user.$documents[user.group]);
						throw e;
					}

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', 'email', 'sort_order', 'password', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type', '$documents'])) ).is('array').length(0);

				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}

				return db.commit();
			});
		});

		/** */
		it('fetching related documents with reversed relations', function(){
			var user_type, group_type, group, user1, user2, user3;
			return nopg.start(PGCONFIG)
			 .createType("Test_ReversedRelations_user")({
				"$schema":{
					"type":"object",
					"properties": {
						"name": {"type": "string"},
						"group": {"type": "string"},
						"email": {"type": "string"},
						"password": {"type": "string"},
						"sort_order": {"type": "number"}
					}
				}//,
				//'relations': {
				//	'group': 'Test_ReversedRelations_group',
				//}
			 })
			 .createType("Test_ReversedRelations_group")({
				"$schema":{
					"type": "object",
					"properties": {
						"name": {"type": "string"},
						"password": {"type": "string"},
						"sort_order": {"type": "number"}
					}
				}
			 })
			 .create("Test_ReversedRelations_group")({"name":"Users", "password": "secret", "sort_order": 10})
			 .then(function(db) {
				user_type = db.fetch();

				try {
					debug.assert(user_type).is('object');
					debug.assert(user_type.$events).is('object');
					debug.assert(user_type.$id).is('uuid');
					debug.assert(user_type.$name).is('string').equals("Test_ReversedRelations_user");
					debug.assert(user_type.$schema).is('object');
					//debug.assert(user_type.$validator).is('function');
					debug.assert(user_type.$meta).is('object');
					debug.assert(user_type.$created).is('date string');
					debug.assert(user_type.$modified).is('date string');

					debug.assert( Object.keys(user_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'/*, 'relations'*/])) ).is('array').length(0);
				} catch(e) {
					debug.log('user_type = ', user_type);
					throw e;
				}

				group_type = db.fetch();

				try {
					debug.assert(group_type).is('object');
					debug.assert(group_type.$events).is('object');
					debug.assert(group_type.$id).is('uuid');
					debug.assert(group_type.$name).is('string').equals("Test_ReversedRelations_group");
					debug.assert(group_type.$schema).is('object');
					//debug.assert(group_type.$validator).is('function');
					debug.assert(group_type.$meta).is('object');
					debug.assert(group_type.$created).is('date string');
					debug.assert(group_type.$modified).is('date string');

					debug.assert( Object.keys(group_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group_type = ', group_type);
					throw e;
				}

				group = db.fetch();

				try {
					debug.assert(group).is('object');
					debug.assert(group.name).is('string').equals('Users');
					debug.assert(group.password).is('string').equals('secret');
					debug.assert(group.sort_order).is('number').equals(10);
					debug.assert(group.$events).is('object');
					debug.assert(group.$id).is('uuid');
					debug.assert(group.$content).is('object');
					debug.assert(group.$types_id).is('uuid').equals(group_type.$id);
					debug.assert(group.$created).is('date string');
					debug.assert(group.$modified).is('date string');
					debug.assert(group.$type).is('string').equals('Test_ReversedRelations_group');

					debug.assert( Object.keys(group).filter(not_in(['name', 'password', 'sort_order', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group = ', group);
					throw e;
				}

				return db.create('Test_ReversedRelations_user')({'name': 'foobar', 'group': group.$id, 'email': 'foobar@example.com', 'sort_order': 1000, 'password': 'secret1234'})
				         .create('Test_ReversedRelations_user')({'name': 'foobar2', 'group': group.$id, 'email': 'foobar2@example.com', 'sort_order': 1001, 'password': 'secret12345'})
				         .create('Test_ReversedRelations_user')({'name': 'foobar3', 'group': group.$id, 'email': 'foobar3@example.com', 'sort_order': 1002, 'password': 'secret123456'});
			}).then(function(db) {
				var user = user1 = db.fetch();
				user2 = db.fetch();
				user3 = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.email).is('string').equals('foobar@example.com');
					debug.assert(user.password).is('string').equals('secret1234');
					debug.assert(user.sort_order).is('number').equals(1000);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Test_ReversedRelations_user');

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', 'email', 'password', 'sort_order', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}

				return db.searchSingle('Test_ReversedRelations_group')({'$id': group.$id}, {
					'documents': ['users{Test_ReversedRelations_user#group}|$id,$type,$types_id,name,sort_order']
				});

			}).then(function(db) {
				var group_res = db.fetch();

				debug.log('group = ' + JSON.stringify(group_res, null, 2) );

				try {
					debug.assert(group_res).is('object');
					debug.assert(group_res.name).is('string').equals('Users');
					debug.assert(group_res.$documents).is('object');
					debug.assert(group_res.$documents.expressions).is('object');
					debug.assert(group_res.$documents.expressions['content.users']).is('array').length(3);
					debug.assert(group_res.$documents.expressions['content.users'][0]).is('uuid').equals(user1.$id);
					debug.assert(group_res.$documents.expressions['content.users'][1]).is('uuid').equals(user2.$id);
					debug.assert(group_res.$documents.expressions['content.users'][2]).is('uuid').equals(user3.$id);

					debug.assert(group_res.users).is('array').length(3);
					debug.assert(group_res.users[0]).is('uuid').equals(user1.$id);
					debug.assert(group_res.users[1]).is('uuid').equals(user2.$id);
					debug.assert(group_res.users[2]).is('uuid').equals(user3.$id);

					debug.assert(group_res.$events).is('object');
					debug.assert(group_res.$id).is('uuid').equals(group.$id);
					debug.assert(group_res.$content).is('object');
					debug.assert(group_res.$types_id).is('uuid').equals(group_type.$id);
					debug.assert(group_res.$created).is('date string');
					debug.assert(group_res.$modified).is('date string');
					debug.assert(group_res.$type).is('string').equals('Test_ReversedRelations_group');

					debug.assert(group_res.$documents).is('object');

					try {
						debug.assert(group_res.$documents[user1.$id].sort_order).is('number').equals(1000);
						debug.assert(group_res.$documents[user1.$id].password).is('undefined');
						debug.assert(group_res.$documents[user1.$id].email).is('undefined');
						debug.assert(group_res.$documents[user1.$id].$events).is('object');
						debug.assert(group_res.$documents[user1.$id].$id).is('uuid');
						debug.assert(group_res.$documents[user1.$id].$content).is('object');
						debug.assert(group_res.$documents[user1.$id].$type).is('string').equals('Test_ReversedRelations_user');
						debug.assert(group_res.$documents[user1.$id].$types_id).is('uuid').equals(user_type.$id);
						debug.assert( Object.keys(group_res.$documents[user1.$id]).filter(not_in(['name', 'sort_order', '$events', '$id', '$content', '$types_id', '$type' /*, '$created', '$modified'*/])) ).is('array').length(0);
					} catch(e) {
						debug.log('group_res.$documents[user1.$id] = ', group_res.$documents[user1.$id]);
						throw e;
					}

					debug.assert( Object.keys(group_res).filter(not_in(['name', 'group', 'email', 'sort_order', 'password', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type', '$documents', 'users'])) ).is('array').length(0);

				} catch(e) {
					debug.log('group = ', group_res);
					throw e;
				}

				return db.commit();
			});
		});

		/** */
		it('fetching related documents by type with typeAwareness', function(){
			var user_type, group_type, group;
			return nopg.start(PGCONFIG)
			 .createType("Testferedobytypeaware_user")({
				"$schema":{
					"type":"object",
					"properties": {
						"name": {"type": "string"},
						"group": {"type": "string"}
					}
				},
				'documents': ['Testferedobytypeaware_group#group']
			 })
			 .createType("Testferedobytypeaware_group")({
				"$schema":{
					"type": "object",
					"properties": {
						"name": {"type": "string"}
					}
				}
			 })
			 .create("Testferedobytypeaware_group")({"name":"Users"})
			 .then(function(db) {
				user_type = db.fetch();

				try {
					debug.assert(user_type).is('object');
					debug.assert(user_type.$events).is('object');
					debug.assert(user_type.$id).is('uuid');
					debug.assert(user_type.$name).is('string').equals("Testferedobytypeaware_user");
					debug.assert(user_type.$schema).is('object');
					//debug.assert(user_type.$validator).is('function');
					debug.assert(user_type.$meta).is('object');
					debug.assert(user_type.$created).is('date string');
					debug.assert(user_type.$modified).is('date string');

					debug.assert( Object.keys(user_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified', 'documents'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user_type = ', user_type);
					throw e;
				}

				group_type = db.fetch();

				try {
					debug.assert(group_type).is('object');
					debug.assert(group_type.$events).is('object');
					debug.assert(group_type.$id).is('uuid');
					debug.assert(group_type.$name).is('string').equals("Testferedobytypeaware_group");
					debug.assert(group_type.$schema).is('object');
					//debug.assert(group_type.$validator).is('function');
					debug.assert(group_type.$meta).is('object');
					debug.assert(group_type.$created).is('date string');
					debug.assert(group_type.$modified).is('date string');

					debug.assert( Object.keys(group_type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group_type = ', group_type);
					throw e;
				}

				group = db.fetch();

				try {
					debug.assert(group).is('object');
					debug.assert(group.name).is('string').equals('Users');
					debug.assert(group.$events).is('object');
					debug.assert(group.$id).is('uuid');
					debug.assert(group.$content).is('object');
					debug.assert(group.$types_id).is('uuid').equals(group_type.$id);
					debug.assert(group.$created).is('date string');
					debug.assert(group.$modified).is('date string');
					debug.assert(group.$type).is('string').equals('Testferedobytypeaware_group');

					debug.assert( Object.keys(group).filter(not_in(['name', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('group = ', group);
					throw e;
				}

				return db.create('Testferedobytypeaware_user')({'name': 'foobar', 'group': group.$id});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Testferedobytypeaware_user');

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}


				return db.searchSingle('Testferedobytypeaware_user')({'$id': user.$id}, {
					'typeAwareness': true
				});
			}).then(function(db) {
				var user = db.fetch();

				try {
					debug.assert(user).is('object');
					debug.assert(user.name).is('string').equals('foobar');
					debug.assert(user.group).is('uuid').equals(group.$id);
					debug.assert(user.$events).is('object');
					debug.assert(user.$id).is('uuid');
					debug.assert(user.$content).is('object');
					debug.assert(user.$types_id).is('uuid').equals(user_type.$id);
					debug.assert(user.$created).is('date string');
					debug.assert(user.$modified).is('date string');
					debug.assert(user.$type).is('string').equals('Testferedobytypeaware_user');

					debug.assert(user.$documents).is('object');

					try {
						debug.assert(user.$documents[user.group]).is('object');
						debug.assert(user.$documents[user.group].name).is('string').equals('Users');
						debug.assert(user.$documents[user.group].$events).is('object');
						debug.assert(user.$documents[user.group].$id).is('uuid');
						debug.assert(user.$documents[user.group].$content).is('object');
						debug.assert(user.$documents[user.group].$types_id).is('uuid').equals(group_type.$id);
						debug.assert(user.$documents[user.group].$created).is('date string');
						debug.assert(user.$documents[user.group].$modified).is('date string');
						debug.assert(user.$documents[user.group].$type).is('string').equals('Testferedobytypeaware_group');

						debug.assert( Object.keys(user.$documents[user.group]).filter(not_in(['name', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
					} catch(e) {
						debug.log('user.$documents[user.group] = ', user.$documents[user.group]);
						debug.log('user = ', user);
						throw e;
					}

					debug.assert( Object.keys(user).filter(not_in(['name', 'group', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type', '$documents'])) ).is('array').length(0);

				} catch(e) {
					debug.log('user = ', user);
					throw e;
				}

				return db.commit();
			});
		});

		it('.isTCNEventName() can detect TCN event names', function(){

			debug.assert( nopg.isTCNEventName ).is('function');

			debug.assert( nopg.isTCNEventName() ).is('boolean').equals(false);
			debug.assert( nopg.isTCNEventName('') ).is('boolean').equals(false);
			debug.assert( nopg.isTCNEventName('timeout') ).is('boolean').equals(false);
			debug.assert( nopg.isTCNEventName('commit') ).is('boolean').equals(false);
			debug.assert( nopg.isTCNEventName('rollback') ).is('boolean').equals(false);
			debug.assert( nopg.isTCNEventName('disconnect') ).is('boolean').equals(false);

			debug.assert( nopg.isTCNEventName('create') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('update') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('delete') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('createType') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('updateType') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('deleteType') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('createAttachment') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('updateAttachment') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('deleteAttachment') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('createLib') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('updateLib') ).is('boolean').equals(true);
			debug.assert( nopg.isTCNEventName('deleteLib') ).is('boolean').equals(true);

		});

		it('.isLocalEventName() can detect local event names', function(){

			debug.assert( nopg.isLocalEventName ).is('function');

			debug.assert( nopg.isLocalEventName('timeout') ).is('boolean').equals(true);
			debug.assert( nopg.isLocalEventName('commit') ).is('boolean').equals(true);
			debug.assert( nopg.isLocalEventName('rollback') ).is('boolean').equals(true);
			debug.assert( nopg.isLocalEventName('disconnect') ).is('boolean').equals(true);

			debug.assert( nopg.isLocalEventName() ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('') ).is('boolean').equals(false);

			debug.assert( nopg.isLocalEventName('create') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('update') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('delete') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('createType') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('updateType') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('deleteType') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('createAttachment') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('updateAttachment') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('deleteAttachment') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('createLib') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('updateLib') ).is('boolean').equals(false);
			debug.assert( nopg.isLocalEventName('deleteLib') ).is('boolean').equals(false);

		});

		it('.isEventName() can detect event names', function(){

			debug.assert( nopg.isEventName ).is('function');

			debug.assert( nopg.isEventName() ).is('boolean').equals(false);
			debug.assert( nopg.isEventName('') ).is('boolean').equals(false);

			debug.assert( nopg.isEventName('timeout') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('commit') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('rollback') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('disconnect') ).is('boolean').equals(true);

			debug.assert( nopg.isEventName('create') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('update') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('delete') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('createType') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('updateType') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('deleteType') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('createAttachment') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('updateAttachment') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('deleteAttachment') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('createLib') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('updateLib') ).is('boolean').equals(true);
			debug.assert( nopg.isEventName('deleteLib') ).is('boolean').equals(true);

		});

		it('.stringifyEventName() can stringify event objects', function(){

			debug.assert( nopg.stringifyEventName ).is('function');

			debug.assert( nopg.stringifyEventName({}) ).is('string').equals('');

			// Parses tcn event names correctly
			debug.assert( nopg.stringifyEventName({'type':'User'}) ).is('string').equals('User#');
			debug.assert( nopg.stringifyEventName({'id':'b6913d79-d37a-5977-94b5-95bdfe5cccda'}) ).is('string').equals('b6913d79-d37a-5977-94b5-95bdfe5cccda@');
			debug.assert( nopg.stringifyEventName({'name':'create'}) ).is('string').equals('create');
			debug.assert( nopg.stringifyEventName({'type':'User','id':'b6913d79-d37a-5977-94b5-95bdfe5cccda'}) ).is('string').equals('User#b6913d79-d37a-5977-94b5-95bdfe5cccda@');
			debug.assert( nopg.stringifyEventName({'type':'User','id':'b6913d79-d37a-5977-94b5-95bdfe5cccda','name':'create'}) ).is('string').equals('User#b6913d79-d37a-5977-94b5-95bdfe5cccda@create');
			debug.assert( nopg.stringifyEventName({'name':'create','type':'User'}) ).is('string').equals('User#create');

			// Types, etc are ignored if event name is local.
			debug.assert( nopg.stringifyEventName({'name':'timeout','type':'User'}) ).is('string').equals('timeout');
			debug.assert( nopg.stringifyEventName({'name':'commit','type':'User'}) ).is('string').equals('commit');
			debug.assert( nopg.stringifyEventName({'name':'rollback','type':'User'}) ).is('string').equals('rollback');
			debug.assert( nopg.stringifyEventName({'name':'disconnect','type':'User'}) ).is('string').equals('disconnect');

		});

		it('.parseEventName() can stringify event objects', function(){

			debug.assert( nopg.parseEventName ).is('function');

			var obj;

			//
			obj = nopg.parseEventName('');
			debug.assert( obj ).is('object');
			debug.assert( Object.keys(obj) ).is('array').length(0);

			//
			obj = nopg.parseEventName('User#');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('User');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('User');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('User');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('b6913d79-d37a-5977-94b5-95bdfe5cccda');
			debug.assert( obj ).is('object');
			debug.assert( obj.id ).is('string').equals('b6913d79-d37a-5977-94b5-95bdfe5cccda');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('create');
			debug.assert( obj ).is('object');
			debug.assert( obj.name ).is('string').equals('create');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('update');
			debug.assert( obj ).is('object');
			debug.assert( obj.name ).is('string').equals('update');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('b6913d79-d37a-5977-94b5-95bdfe5cccda#');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('b6913d79-d37a-5977-94b5-95bdfe5cccda');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('b6913d79-d37a-5977-94b5-95bdfe5cccda#3fbacacb-45ee-5733-be50-3d78c6c90e6b@');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('b6913d79-d37a-5977-94b5-95bdfe5cccda');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( Object.keys(obj) ).is('array').length(2);

			//
			obj = nopg.parseEventName('b6913d79-d37a-5977-94b5-95bdfe5cccda#3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('b6913d79-d37a-5977-94b5-95bdfe5cccda');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( Object.keys(obj) ).is('array').length(2);

			//
			obj = nopg.parseEventName('3fbacacb-45ee-5733-be50-3d78c6c90e6b@');
			debug.assert( obj ).is('object');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( obj ).is('object');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( Object.keys(obj) ).is('array').length(1);

			//
			obj = nopg.parseEventName('3fbacacb-45ee-5733-be50-3d78c6c90e6b@create');
			debug.assert( obj ).is('object');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( obj.name ).is('string').equals('create');
			debug.assert( Object.keys(obj) ).is('array').length(2);

			//
			obj = nopg.parseEventName('3fbacacb-45ee-5733-be50-3d78c6c90e6b#create');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( obj.name ).is('string').equals('create');
			debug.assert( Object.keys(obj) ).is('array').length(2);

			//
			obj = nopg.parseEventName('b6913d79-d37a-5977-94b5-95bdfe5cccda#3fbacacb-45ee-5733-be50-3d78c6c90e6b@create');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('b6913d79-d37a-5977-94b5-95bdfe5cccda');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( obj.name ).is('string').equals('create');
			debug.assert( Object.keys(obj) ).is('array').length(3);

			//
			obj = nopg.parseEventName('User#3fbacacb-45ee-5733-be50-3d78c6c90e6b@create');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('User');
			debug.assert( obj.id ).is('string').equals('3fbacacb-45ee-5733-be50-3d78c6c90e6b');
			debug.assert( obj.name ).is('string').equals('create');
			debug.assert( Object.keys(obj) ).is('array').length(3);

			//
			obj = nopg.parseEventName('User#create');
			debug.assert( obj ).is('object');
			debug.assert( obj.type ).is('string').equals('User');
			debug.assert( obj.name ).is('string').equals('create');
			debug.assert( Object.keys(obj) ).is('array').length(2);

		});


		it('.parseTCNChannelName() can parse event to channel name', function(){

			debug.assert( nopg.parseTCNChannelName ).is('function');

			debug.assert( nopg.parseTCNChannelName({}) ).is('string').equals('tcn');

			// Parses tcn event names correctly
			debug.assert( nopg.parseTCNChannelName({'type':'User'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName({'id':'b6913d79-d37a-5977-94b5-95bdfe5cccda'}) ).is('string').equals('tcn');
			debug.assert( nopg.parseTCNChannelName({'name':'create'}) ).is('string').equals('tcn');
			debug.assert( nopg.parseTCNChannelName({'type':'User','id':'b6913d79-d37a-5977-94b5-95bdfe5cccda'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName({'type':'User','id':'b6913d79-d37a-5977-94b5-95bdfe5cccda','name':'create'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName({'name':'create','type':'User'}) ).is('string').equals('tcnuser');

			debug.assert( nopg.parseTCNChannelName('User') ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('b6913d79-d37a-5977-94b5-95bdfe5cccda') ).is('string').equals('tcn');
			debug.assert( nopg.parseTCNChannelName('create') ).is('string').equals('tcn');
			debug.assert( nopg.parseTCNChannelName('User#b6913d79-d37a-5977-94b5-95bdfe5cccda') ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('User#b6913d79-d37a-5977-94b5-95bdfe5cccda@create') ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('User#create') ).is('string').equals('tcnuser');

			// Hmm, should we throw an exception if it isn't TCN event?
			debug.assert( nopg.parseTCNChannelName({'name':'timeout','type':'User'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName({'name':'commit','type':'User'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName({'name':'rollback','type':'User'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName({'name':'disconnect','type':'User'}) ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('User#timeout') ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('User#commit') ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('User#rollback') ).is('string').equals('tcnuser');
			debug.assert( nopg.parseTCNChannelName('User#disconnect') ).is('string').equals('tcnuser');

		});

		it('.parseTCNPayload() can parse payload to object', function(){

			debug.assert( nopg.parseTCNPayload ).is('function');

			var obj;

			//
			obj = nopg.parseTCNPayload('"documents",I,"id"=\'b6913d79-d37a-5977-94b5-95bdfe5cccda\'');
			debug.assert( obj ).is('object');
			debug.assert( obj.table ).is('string').equals("documents");
			debug.assert( obj.op ).is('string').equals("I");
			debug.assert( obj.keys ).is('object');
			debug.assert( obj.keys.id ).is('string').equals("b6913d79-d37a-5977-94b5-95bdfe5cccda");
			debug.assert( Object.keys(obj.keys) ).is('array').length(1);
			debug.assert( Object.keys(obj) ).is('array').length(3);

			//
			obj = nopg.parseTCNPayload('"types",U,"id"=\'b6913d79-d37a-5977-94b5-95bdfe5cccda\'');
			debug.assert( obj ).is('object');
			debug.assert( obj.table ).is('string').equals("types");
			debug.assert( obj.op ).is('string').equals("U");
			debug.assert( obj.keys ).is('object');
			debug.assert( obj.keys.id ).is('string').equals("b6913d79-d37a-5977-94b5-95bdfe5cccda");
			debug.assert( Object.keys(obj.keys) ).is('array').length(1);
			debug.assert( Object.keys(obj) ).is('array').length(3);

			//
			obj = nopg.parseTCNPayload('"libs",D,"id"=\'b6913d79-d37a-5977-94b5-95bdfe5cccda\'');
			debug.assert( obj ).is('object');
			debug.assert( obj.table ).is('string').equals("libs");
			debug.assert( obj.op ).is('string').equals("D");
			debug.assert( obj.keys ).is('object');
			debug.assert( obj.keys.id ).is('string').equals("b6913d79-d37a-5977-94b5-95bdfe5cccda");
			debug.assert( Object.keys(obj.keys) ).is('array').length(1);
			debug.assert( Object.keys(obj) ).is('array').length(3);

		});


		it('typed document creation with method', function(){
			return nopg.start(PGCONFIG).createType("MethodTest")({"$schema":{"type":"object"}}).createMethod("MethodTest")("tag", function() {
				return this.hello.toUpperCase();
			}).createDocumentBuilder("MethodTest")().create("MethodTest")({"hello":"world"}).then(function(db) {
				var type = db.fetch();

				try {
					debug.assert(type).is('object');
					debug.assert(type.$events).is('object');
					debug.assert(type.$id).is('uuid');
					debug.assert(type.$name).is('string').equals("MethodTest");
					debug.assert(type.$schema).is('object');
					debug.assert(type.$meta).is('object');
					debug.assert(type.$created).is('date string');
					debug.assert(type.$modified).is('date string');

					debug.assert( Object.keys(type).filter(not_in(['$events', '$id', '$name', '$schema', '$validator', '$meta', '$created', '$modified'])) ).is('array').length(0);
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				var method = db.fetch();

				try {
					debug.assert(method).is('object');
					debug.assert(method.$events).is('object');
					debug.assert(method.$id).is('uuid');
					debug.assert(method.$types_id).is('uuid').equals(type.$id);
					debug.assert(method.$type).is('string').equals('MethodTest');
					debug.assert(method.$active).is('boolean').equals(true);
					debug.assert(method.$name).is('string').equals("tag");
					debug.assert(method.$body).is('string');
					debug.assert(method.$meta).is('object');
					debug.assert(method.$created).is('date string');
					debug.assert(method.$modified).is('date string');

					debug.assert( Object.keys(method).filter(not_in(['$events', '$active', '$id', '$meta', '$types_id', '$body', '$name', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('method = ', method);
					throw e;
				}

				var createDocumentBuilder = db.fetch();
				debug.assert(createDocumentBuilder).is('function');

				var doc = createDocumentBuilder( db.fetch() );

				try {
					debug.assert(doc).is('object');
					debug.assert(doc.hello).is('string').equals('world');
					debug.assert(doc.tag).is('function');
					debug.assert(doc.tag()).is('string').equals('WORLD');
					debug.assert(doc.$events).is('object');
					debug.assert(doc.$id).is('uuid');
					debug.assert(doc.$content).is('object');
					debug.assert(doc.$types_id).is('uuid').equals(type.$id);
					debug.assert(doc.$created).is('date string');
					debug.assert(doc.$modified).is('date string');
					debug.assert(doc.$type).is('string').equals('MethodTest');

					debug.assert( Object.keys(doc).filter(not_in(['hello', 'tag', '$events', '$id', '$content', '$types_id', '$created', '$modified', '$type'])) ).is('array').length(0);
				} catch(e) {
					debug.log('doc = ', doc);
					throw e;
				}

				return db.commit();
			});
		});

		it('typed document search with methods', function(){
			return nopg.start(PGCONFIG)
			  .createType("MethodTestYmMGe0M6")()
			  .createMethod("MethodTestYmMGe0M6")("tag", function() {
				return (''+this.foo).toUpperCase();
			}).createMethod("MethodTestYmMGe0M6")("tags", function() {
				return [this.tag()];
			}).createDocumentBuilder("MethodTestYmMGe0M6")()
			  .create("MethodTestYmMGe0M6")({"foo":'bar1'})
			  .create("MethodTestYmMGe0M6")({"foo":'bar2'})
			  .create("MethodTestYmMGe0M6")({"foo":'bar3'})
			  .search("MethodTestYmMGe0M6")()
			  .then(function(db) {
				var type = db.fetch();
				var method1 = db.fetch();
				var method2 = db.fetch();
				var docbuilder = db.fetch();
				var item0 = docbuilder(db.fetch());
				var item1 = docbuilder(db.fetch());
				var item2 = docbuilder(db.fetch());
				var items = docbuilder(db.fetch());

				try {
					assert.strictEqual(type.$name, "MethodTestYmMGe0M6");
				} catch(e) {
					debug.log('type = ', type);
					throw e;
				}

				try {
					assert.strictEqual(item0.foo, 'bar1');
					debug.assert(item0.tag).is('function');
					debug.assert(item0.tags).is('function');
					assert.strictEqual(item0.tag(), 'BAR1');
					debug.assert(item0.tags()).is('array').length(1);
				} catch(e) { debug.log('item0 = ', item0); throw e; }

				try {
					assert.strictEqual(item1.foo, 'bar2');
					debug.assert(item1.tag).is('function');
					debug.assert(item1.tags).is('function');
					assert.strictEqual(item1.tag(), 'BAR2');
					debug.assert(item1.tags()).is('array').length(1);
				} catch(e) { debug.log('item1 = ', item1); throw e; }

				try {
					assert.strictEqual(item2.foo, 'bar3');
					debug.assert(item2.tag).is('function');
					debug.assert(item2.tags).is('function');
					assert.strictEqual(item2.tag(), 'BAR3');
					debug.assert(item2.tags()).is('array').length(1);
				} catch(e) { debug.log('item2 = ', item2); throw e; }

				try {
					assert.strictEqual(items.length, 3);
					assert.strictEqual(item0.foo, items[0].foo);
					assert.strictEqual(item1.foo, items[1].foo);
					assert.strictEqual(item2.foo, items[2].foo);
					assert.strictEqual(item0.tag(), items[0].tag());
					assert.strictEqual(item1.tag(), items[1].tag());
					assert.strictEqual(item2.tag(), items[2].tag());
				} catch(e) { debug.log('items = ', items); throw e; }

				return db.commit();
			});
		});

// End of tests

	});

});

/* EOF */

