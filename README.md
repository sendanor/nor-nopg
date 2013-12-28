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

### Creating objects (without type)

```javascript
db.create()({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

### Editing objects

```javascript
doc.hello = "world";

db.update(doc).then(function(db) {
	console.log("Successfully edited object: " + util.inspect(doc) );
});
```

```javascript
db.update(doc, {"hello": "world"}).then(function(db) {
	console.log("Successfully edited object: " + util.inspect(doc) );
});
```

### Searching objects

```javascript
db.search({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

```javascript
db.search({"hello": "world"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

```javascript
db.search(function(doc) {
	return doc.hello === 'world';
}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

### Deleting objects

```javascript
db.del(doc).then(function(db) {
	console.log("Object deleted succesfully.");
});
```

### Creating objects with type

```javascript
db.create(type)({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new object: " + util.inspect(doc) );
});
```

### Editing objects by type

```javascript
/* n/a */
```

### Searching objects by type

```javascript
db.search(type)().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

### Deleting objects by type

```javascript
db.del(function(doc) {
	
}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

Types
-----

### Creating types

```javascript
db.createType("Product")({"schema":{"type":"object"}}).then(function(db) {
	var type = db.fetch();
	console.log("Successfully created new type: " + util.inspect(type) );
});
```

```javascript
db.createType()({"schema":{"type":"object"}}).then(function(db) {
	var product_type = db.fetch();
	console.log("Successfully created new type: " + util.inspect(product_type) );
});
```

### Editing types

```javascript
type.schema = {..};
db.update(type).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

```javascript
db.update(type, {schema:{...}}).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

### Deleting types

```javascript
db.del(type).then(function(db) {
	console.log("Type deleted succesfully.");
});
```

### Searching types

```javascript
db.searchTypes({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found types: " + util.inspect(list) );
});
```

Attachments
-----------

### Creating attachments

```javascript
doc.createAttachment(data, {"content-type": "image/png"}).then(function(db) {
	var file = db.fetch();
	console.log("Successfully created new attachment: " + util.inspect(file) );
});
```

### Searching attachments

```javascript
doc.searchAttachments().then(function(db) {
	var list = db.fetch();
	console.log("Found attachments: " + util.inspect(list) );
});
```

```javascript
doc.getAttachment("b58e402e-6b39-11e3-99c7-0800279ca880").then(function(db) {
	var attachment = db.fetch();
	console.log("Found attachment: " + util.inspect(attachment) );
});
```

### Deleting attachments

```javascript
db.del(attachment).then(function(db) {
	console.log("Attachment deleted succesfully.");
});
```

Libs
----

### Importing/Upgrading modules into database

```javascript
db.import('/path/to/tv4.js', {'name': 'tv4'}).then(function(db) {
	console.log("Library imported succesfully.");
});
```

Running tests
-------------

```
PGCONFIG='pg://jhh:password@localhost/jhh' npm test
```
