# TOC
   - [nopg](#nopg)
     - [.start](#nopg-start)
     - [tests](#nopg-tests)
<a name=""></a>
 
<a name="nopg"></a>
# nopg
<a name="nopg-start"></a>
## .start
is callable.

```js
assert.strictEqual(typeof nopg.start, 'function');
```

<a name="nopg-tests"></a>
## tests
.create()({"hello":"world"}) works.

```js
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
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.createType("Test") and .create("Test")({"hello":"world"}) works.

```js
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
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.create()({"hello":"world"}) and .update(doc, {"hello": "another"}) works.

```js
var doc;
nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
	doc = db.fetch();
	util.debug('before doc = ' + util.inspect(doc));
	assert.strictEqual(doc.hello, 'world');
	return db.update(doc, {"hello": "another"});
}).then(function(db) {
	var doc2 = db.fetch();
	util.debug('updated doc2 = ' + util.inspect(doc2));
	assert.strictEqual(typeof doc2.hello, 'string');
	assert.strictEqual(doc2.hello, 'another');
	assert.strictEqual(doc.$id, doc2.$id);
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.create()({"hello":"world"}) and .update(doc) works.

```js
var doc;
nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
	doc = db.fetch();
	util.debug('before doc = ' + util.inspect(doc));
	doc.hello = "another";
	return db.update(doc);
}).then(function(db) {
	util.debug('updated doc = ' + util.inspect(doc));
	assert.strictEqual(typeof doc.hello, 'string');
	assert.strictEqual(doc.hello, 'another');
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.create()({"hello":"world"}) and .del(doc) works.

```js
var doc;
nopg.start(PGCONFIG).create()({"hello":"world"}).then(function(db) {
	doc = db.fetch();
	util.debug('before doc = ' + util.inspect(doc));
	return db.del(doc);
}).then(function(db) {
	// FIXME: Test that the doc was really deleted.
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.search()({"hello":"UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT"}) works.

```js
nopg.start(PGCONFIG).create()({"hello":"UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT"}).then(function(db) {
	debug.log('db is ', db);
	var doc = db.fetch();
	util.debug('doc = ' + util.inspect(doc));
	assert.strictEqual(typeof doc.hello, 'string');
	assert.strictEqual(doc.hello, 'UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT');
	return db.search()({"hello":"UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT"});
}).then(function(db) {
	var items = db.fetch();
	assert.strictEqual(items.length, 1);
	var doc = items.shift();
	assert.strictEqual(typeof doc.hello, 'string');
	assert.strictEqual(doc.hello, 'UAJuE5ya6m9UvUM87GUFu7GBIJWghHMT');
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.search()({"$id":"..."}) works for type AF82RqSsXM527S3PGK76r6H3xjWqnYgP.

```js
var id;
nopg.start(PGCONFIG).create()({"hello":"AF82RqSsXM527S3PGK76r6H3xjWqnYgP"}).then(function(db) {
	debug.log('db is ', db);
	var doc = db.fetch();
	util.debug('doc = ' + util.inspect(doc));
	assert.strictEqual(typeof doc.hello, 'string');
	assert.strictEqual(doc.hello, 'AF82RqSsXM527S3PGK76r6H3xjWqnYgP');
	id = doc.$id;
	return db.search()({"$id":doc.$id});
}).then(function(db) {
	var items = db.fetch();
	assert.strictEqual(items.length, 1);
	var doc = items.shift();
	assert.strictEqual(typeof doc.hello, 'string');
	assert.strictEqual(doc.hello, 'AF82RqSsXM527S3PGK76r6H3xjWqnYgP');
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.search("TestYmMGe0M6")() works.

```js
nopg.start(PGCONFIG)
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
	assert.strictEqual(type.$name, "TestYmMGe0M6");
	assert.strictEqual(item0.foo, 1);
	assert.strictEqual(item1.foo, 2);
	assert.strictEqual(item2.foo, 3);
	assert.strictEqual(items.length, 3);
	assert.strictEqual(item0.foo, items[0].foo);
	assert.strictEqual(item1.foo, items[1].foo);
	assert.strictEqual(item2.foo, items[2].foo);
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.search("TestMxvLtb3x")({"foo":2}) works.

```js
nopg.start(PGCONFIG)
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
	assert.strictEqual(type.$name, "TestMxvLtb3x");
	assert.strictEqual(item0.foo, 1);
	assert.strictEqual(item0.bar, "foobar");
	assert.strictEqual(item1.bar, "hello");
	assert.strictEqual(item1.bar, "hello");
	assert.strictEqual(item2.foo, 3);
	assert.strictEqual(items.length, 1);
	assert.strictEqual(item1.foo, items[0].foo);
	assert.strictEqual(item1.bar, items[0].bar);
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.search("Testg1KrHD2a")({"foo":"2"}) works by type object.

```js
var type;
nopg.start(PGCONFIG)
  .createType("Testg1KrHD2a")()
  .then(function(db) {
	type = db.fetch();
	debug.log("type = ", type);
	assert.strictEqual(type instanceof nopg.Type, true);
	return db.create(type)({"foo":1,"bar":"foobar"})
	  .create(type)({"foo":2,"bar":"hello"})
	  .create(type)({"foo":3})
	  .search(type)({"bar":"hello"});
  }).then(function(db) {
	var item0 = db.fetch();
	var item1 = db.fetch();
	var item2 = db.fetch();
	var items = db.fetch();
	debug.log("item0 = ", item0);
	debug.log("item1 = ", item1);
	debug.log("item2 = ", item2);
	debug.log("items = ", items);
	assert.strictEqual(type.$name, "Testg1KrHD2a");
	assert.strictEqual(item0.foo, 1);
	assert.strictEqual(item0.bar, "foobar");
	assert.strictEqual(item1.bar, "hello");
	assert.strictEqual(item1.bar, "hello");
	assert.strictEqual(item2.foo, 3);
	assert.strictEqual(items.length, 1);
	assert.strictEqual(item1.foo, items[0].foo);
	assert.strictEqual(item1.bar, items[0].bar);
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

Creating unnamed types.

```js
var type;
nopg.start(PGCONFIG)
  .createType()()
  .then(function(db) {
	type = db.fetch();
	debug.log("type = ", type);
	assert.strictEqual(type instanceof nopg.Type, true);
	return db.create(type)({"foo":1,"bar":"foobar"})
	  .create(type)({"foo":2,"bar":"hello"})
	  .create(type)({"foo":3})
	  .search(type)({"bar":"hello"});
  }).then(function(db) {
	var item0 = db.fetch();
	var item1 = db.fetch();
	var item2 = db.fetch();
	var items = db.fetch();
	debug.log("item0 = ", item0);
	debug.log("item1 = ", item1);
	debug.log("item2 = ", item2);
	debug.log("items = ", items);
	assert.strictEqual(item0.foo, 1);
	assert.strictEqual(item0.bar, "foobar");
	assert.strictEqual(item1.bar, "hello");
	assert.strictEqual(item1.bar, "hello");
	assert.strictEqual(item2.foo, 3);
	assert.strictEqual(items.length, 1);
	assert.strictEqual(item1.foo, items[0].foo);
	assert.strictEqual(item1.bar, items[0].bar);
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.createType("TypeXvsMtxJyWE")({"hello":"world1"}) and .createOrReplaceType("TypeXvsMtxJyWE")({"hello":"world2"}) works.

```js
nopg.start(PGCONFIG).createType("TypeXvsMtxJyWE")({"hello":"world1"}).createOrReplaceType("TypeXvsMtxJyWE")({"hello":"world2"}).then(function(db) {
	debug.log('db is ', db);
	var type1 = db.fetch();
	var type2 = db.fetch();
	util.debug('type1 = ', util.inspect(type1));
	util.debug('type2 = ', util.inspect(type2));
	assert.strictEqual(typeof type1, 'object');
	assert.strictEqual(typeof type2, 'object');
	assert.strictEqual(typeof type1.hello, 'string');
	assert.strictEqual(typeof type2.hello, 'string');
	assert.strictEqual(type1.hello, 'world1');
	assert.strictEqual(type2.hello, 'world2');
	assert.strictEqual(type1.$id, type2.$id);
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.createOrReplaceType("Type4UJHIRRiCc")({"hello":"world"}) works.

```js
nopg.start(PGCONFIG).createOrReplaceType("Type4UJHIRRiCc")({"hello":"world"}).then(function(db) {
	debug.log('db is ', db);
	var type1 = db.fetch();
	util.debug('type1 = ', util.inspect(type1));
	assert.strictEqual(typeof type1, 'object');
	assert.strictEqual(typeof type1.hello, 'string');
	assert.strictEqual(type1.hello, 'world');
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

.createOrReplaceType("TypeSession4UJHIRRiCc")({"$schema":{"type":"object"}}) works.

```js
nopg.start(PGCONFIG).createOrReplaceType("TypeSession4UJHIRRiCc")({"$schema":{"type":"object"}}).then(function(db) {
	debug.log('db is ', db);
	var type1 = db.fetch();
	util.debug('type1 = ', util.inspect(type1));
	assert.strictEqual(typeof type1, 'object');
	assert.strictEqual(typeof type1.$schema, 'object');
	assert.strictEqual(type1.$schema.type, 'object');
	return db.commit();
}).then(function(db) {
	done();
}).fail(function(err) {
	debug.log('Database query failed: ' + err);
	done(err);
}).done();
```

