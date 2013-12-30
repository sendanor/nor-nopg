[![Build Status](https://secure.travis-ci.org/Sendanor/nor-nopg.png?branch=master)](http://travis-ci.org/Sendanor/nor-nopg)

nor-nopg
========

PostgreSQL Module for Sendanor NoSQL Schema.

Usage
-----

```javascript
var nopg = require('nor-nopg');
```

Internal Database Schema
------------------------

![ERS](gfx/ers.png "ERS")

Status
------

| Name |   Description    |                   Example                   |
| ---- | ---------------- | ------------------------------------------- |
| NoPg | NoPg constructor | var NoPg = require('nor-nopg');             |
| db   | NoPg instance    | NoPg.start(...).then(function(db) { ... }); |

|             Description              |         Returns          |              Sample usage              |                                            Tested                                            |
| ------------------------------------ | ------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| Get connection and start transaction | Promise of NoPg instance | NoPg.start(...)                        | [test-nopg.js:42](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L42)   |
| Initialize database                  | Promise of NoPg instance | db.init()                              | [test-nopg.js:15](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L15)   |
| Create object without type           | Promise of NoPg instance | db.create()({"hello":"world"})         | [test-nopg.js:41](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L41)   |
| Create object with type as string    | Promise of NoPg instance | db.create("MyType")({"hello":"world"}) | [test-nopg.js:57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57)   |
| Create object with type as object    | Promise of NoPg instance | db.create(type)({"hello":"world"})     | [test-nopg.js:306](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L306) |
|                                      |                          |                                        |                                                                                              |

Connections and Transactions
----------------------------

```javascript
nopg.start('postgres://user:pass@localhost/dbname').then(function(db) {
	/* ... */
	return db.commit();
});
```

You must call `db.commit()` to actually save any changes to the database or `db.rollback()` to cancel the 
transaction.

Objects
-------

### Create object

#### Create object without type

```javascript
db.create()({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

#### Create object with type as string

```javascript
db.create("MyType")({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57).

#### Create object with type as object

```javascript
db.create(type)({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

Unimplemented/Untested.

### Search objects

#### Search objects by id

```javascript
db.search()({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Search objects by values

```javascript
db.search()({"hello": "world"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Search objects by custom function

```javascript
db.search()(function(doc) {
	return doc.hello === 'world';
}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Search objects by type string

```javascript
db.search("Foobar")().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Search objects by type string with values

```javascript
db.search("Foobar")({"name":"hello"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Search objects by type

```javascript
db.search(type)().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

### Edit objects

#### Edit object by instance of `NoPg.Object`

```javascript
doc.hello = "world";

db.update(doc).then(function(db) {
	console.log("Successfully edited object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:93](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L93).

#### Edit object by plain object

```javascript
db.update(doc, {"hello": "world"}).then(function(db) {
	console.log("Successfully edited object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:74](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L74).

#### Edit objects by type

```javascript
/* n/a */
```

Unimplemented/Untested.


### Delete objects

#### Delete object by instance of `NoPg.Object`

```javascript
db.del(doc).then(function(db) {
	console.log("Object deleted succesfully.");
});
```

Tested at [test-nopg.js:113](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L113).

#### Delete objects by instance of `NoPg.Type`

```javascript
// n/a
```

Unimplemented/Untested.

#### Delete type by instance of `NoPg.Type`

```javascript
db.del(type).then(function(db) {
	console.log("Type deleted succesfully.");
});
```

Implemented, but not tested.

#### Delete attachment

```javascript
db.del(attachment).then(function(db) {
	console.log("Attachment deleted succesfully.");
});
```

Implemented, but not tested.


Types
-----

### Create types

#### Create type with name as string

```javascript
db.createType("Product")({"schema":{"type":"object"}}).then(function(db) {
	var type = db.fetch();
	console.log("Successfully created new type: " + util.inspect(type) );
});
```

Tested at [test-nopg.js:57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57).

#### Create type without name

```javascript
db.createType()({"schema":{"type":"object"}}).then(function(db) {
	var product_type = db.fetch();
	console.log("Successfully created new type: " + util.inspect(product_type) );
});
```

Unimplemented/Untested.

### Edit types

#### Edit type by instance of `NoPg.Type`

```javascript
type.schema = {..};
db.update(type).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

Implemented, but not tested.

#### Edit type by plain object

```javascript
db.update(type, {schema:{...}}).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

Implemented, but not tested.

### Search types

```javascript
db.searchTypes({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found types: " + util.inspect(list) );
});
```

Unimplemented/Untested.

Attachments
-----------

### Create attachments

```javascript
doc.createAttachment(data, {"content-type": "image/png"}).then(function(db) {
	var file = db.fetch();
	console.log("Successfully created new attachment: " + util.inspect(file) );
});
```

Unimplemented/Untested.

### Search attachments

```javascript
doc.searchAttachments().then(function(db) {
	var list = db.fetch();
	console.log("Found attachments: " + util.inspect(list) );
});
```

Unimplemented/Untested.

```javascript
doc.getAttachment("b58e402e-6b39-11e3-99c7-0800279ca880").then(function(db) {
	var attachment = db.fetch();
	console.log("Found attachment: " + util.inspect(attachment) );
});
```

Unimplemented/Untested.

Libs
----

### Import or upgrade module in database

```javascript
db.import('/path/to/tv4.js', {'name': 'tv4'}).then(function(db) {
	console.log("Library imported succesfully.");
});
```

Unimplemented/Untested.

Run tests
---------

```
PGCONFIG='pg://jhh:password@localhost/jhh' npm test
```
