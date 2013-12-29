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

Transactions
------------

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

### Creating objects

#### Creating objects without specific type

```javascript
db.create()({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:41](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L41).

#### Creating objects with type string

```javascript
db.create("MyType")({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57).

#### Creating objects with type object

```javascript
db.create(type)({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

Unimplemented/Untested.

### Searching objects

#### Searching objects by id

```javascript
db.search()({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Searching objects by values

```javascript
db.search()({"hello": "world"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

#### Searching objects by custom function

```javascript
db.search()(function(doc) {
	return doc.hello === 'world';
}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

### Searching objects by type string

```javascript
db.search("Foobar")().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

### Searching objects by type string with values

```javascript
db.search("Foobar")({"name":"hello"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

### Searching objects by type

```javascript
db.search(type)().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Unimplemented/Untested.

### Editing objects

#### Editing objects by changing properties

```javascript
doc.hello = "world";

db.update(doc).then(function(db) {
	console.log("Successfully edited object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:93](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L93).

#### Editing objects by argument

```javascript
db.update(doc, {"hello": "world"}).then(function(db) {
	console.log("Successfully edited object: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:74](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L74).

#### Editing objects by type

```javascript
/* n/a */
```

Unimplemented/Untested.


### Deleting objects

#### Deleting objects by document object

```javascript
db.del(doc).then(function(db) {
	console.log("Object deleted succesfully.");
});
```

Tested at [test-nopg.js:113](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L113).

#### Deleting objects by type

```javascript
// n/a
```

Unimplemented/Untested.

#### Deleting types

```javascript
db.del(type).then(function(db) {
	console.log("Type deleted succesfully.");
});
```

Implemented, but not tested.

#### Deleting attachments

```javascript
db.del(attachment).then(function(db) {
	console.log("Attachment deleted succesfully.");
});
```

Implemented, but not tested.


Types
-----

### Creating types

#### Creating types by string name

```javascript
db.createType("Product")({"schema":{"type":"object"}}).then(function(db) {
	var type = db.fetch();
	console.log("Successfully created new type: " + util.inspect(type) );
});
```

Tested at [test-nopg.js:57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57).

#### Creating unnamed types

```javascript
db.createType()({"schema":{"type":"object"}}).then(function(db) {
	var product_type = db.fetch();
	console.log("Successfully created new type: " + util.inspect(product_type) );
});
```

Unimplemented/Untested.

### Editing types

#### Editing type by changing properties

```javascript
type.schema = {..};
db.update(type).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

Implemented, but not tested.

#### Editing type by argument

```javascript
db.update(type, {schema:{...}}).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

Implemented, but not tested.

### Searching types

```javascript
db.searchTypes({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found types: " + util.inspect(list) );
});
```

Unimplemented/Untested.

Attachments
-----------

### Creating attachments

```javascript
doc.createAttachment(data, {"content-type": "image/png"}).then(function(db) {
	var file = db.fetch();
	console.log("Successfully created new attachment: " + util.inspect(file) );
});
```

Unimplemented/Untested.

### Searching attachments

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

### Importing/Upgrading modules into database

```javascript
db.import('/path/to/tv4.js', {'name': 'tv4'}).then(function(db) {
	console.log("Library imported succesfully.");
});
```

Unimplemented/Untested.

Running tests
-------------

```
PGCONFIG='pg://jhh:password@localhost/jhh' npm test
```
