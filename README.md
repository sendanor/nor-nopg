[![Build Status](https://secure.travis-ci.org/Sendanor/nor-nopg.png?branch=master)](http://travis-ci.org/Sendanor/nor-nopg)

nor-nopg
========

Node.js PostgreSQL Module for Sendanor NoSQL Schema.

Usage
-----

```javascript
var nopg = require('nor-nopg');
```

Internal Database Schema
------------------------

![ERS](gfx/ers.png "ERS")

Summary
-------

### Variable names used in this document

|  Name  |      Description       |                         Example                         |
| ------ | ---------------------- | ------------------------------------------------------- |
| `NoPg` | `NoPg` constructor     | `var NoPg = require('nor-nopg');`                       |
| `db`   | `NoPg` instance        | `NoPg.start(...).then(function(db) { ... });`           |
| `doc`  | `NoPg.Object` instance | `db.create()(...).shift().then(function(doc) { ... });` |

### Summary of available operations

|                            Short usage                            |                                                         Description                                                         |                                    Tested at                                     |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NoPg.start(...)`                                                 | [Get connection and start transaction](https://github.com/Sendanor/nor-nopg#connections-and-transactions)                   | [L42](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L42)   |
| `db.init()`                                                       | [Initialize database](https://github.com/Sendanor/nor-nopg#initialize-database)                                             | [L15](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L15)   |
| `db.create()({"hello":"world"})`                                  | [Create object without type](https://github.com/Sendanor/nor-nopg#create-object-without-type)                               | [L41](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L41)   |
| `db.create("MyType")({"hello":"world"})`                          | [Create object with type as string](https://github.com/Sendanor/nor-nopg#create-object-with-type-as-string)                 | [L57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57)   |
| `db.create(type)({"hello":"world"})`                              | [Create object with type as object](https://github.com/Sendanor/nor-nopg#create-object-with-type-as-object)                 | [L306](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L306) |
| `db.search()({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"})`    | [Search objects by id](https://github.com/Sendanor/nor-nopg#search-objects-by-id)                                           | [L156](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L156) |
| `db.search()({"hello": "world"})`                                 | [Search objects by values](https://github.com/Sendanor/nor-nopg#search-objects-by-values)                                   | [L130](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L130) |
| `db.search()(function(doc) { return doc.hello === 'world'; })`    | [Search objects by custom function](https://github.com/Sendanor/nor-nopg#search-objects-by-custom-function)                 |                                                                                  |
| `db.search("Foobar")()`                                           | [Search objects by type string](https://github.com/Sendanor/nor-nopg#search-objects-by-type-string)                         | [L185](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L185) |
| `db.search("Foobar")({"name":"hello"})`                           | [Search objects by type string with values](https://github.com/Sendanor/nor-nopg#search-objects-by-type-string-with-values) | [L219](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L219) |
| `db.search(type)()`                                               | [Search objects by type](https://github.com/Sendanor/nor-nopg#search-objects-by-type)                                       |                                                                                  |
| `db.search(type)({"name":"hello"})`                               | [Search objects by type as string with values](https://github.com/Sendanor/nor-nopg#search-objects-by-type)                 | [L254](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L254) |
| `db.update(doc)`                                                  | [Edit object by instance of NoPg.Object](https://github.com/Sendanor/nor-nopg#edit-object-by-instance-of-nopgobject)        | [L93](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L93)   |
| `db.update(doc, {"hello": "world"})`                              | [Edit object by plain object](https://github.com/Sendanor/nor-nopg#edit-object-by-plain-object)                             | [L74](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L74)   |
| n/a                                                               | [Edit objects by type](https://github.com/Sendanor/nor-nopg#edit-objects-by-type)                                           |                                                                                  |
| `db.del(doc)`                                                     | [Delete object by instance of NoPg.Object](https://github.com/Sendanor/nor-nopg#delete-object-by-instance-of-nopgobject)    | [L113](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L113) |
| n/a                                                               | [Delete objects by instance of NoPg.Type](https://github.com/Sendanor/nor-nopg#delete-objects-by-instance-of-nopgtype)      |                                                                                  |
| `db.del(type)`                                                    | [Delete type by instance of NoPg.Type](https://github.com/Sendanor/nor-nopg#delete-type-by-instance-of-nopgtype)            |                                                                                  |
| `db.del(attachment)`                                              | [Delete attachment](https://github.com/Sendanor/nor-nopg#delete-attachment)                                                 |                                                                                  |
| `db.createType("Product")({"$schema":{"type":"object"}})`         | [Create type with name as string](https://github.com/Sendanor/nor-nopg#create-type-with-name-as-string)                     |                                                                                  |
| `db.createType()({"$schema":{"type":"object"}})`                  | [Create type without name](https://github.com/Sendanor/nor-nopg#create-type-without-name)                                   |                                                                                  |
| `db.update(type)`                                                 | [Edit type by instance of NoPg.Type](https://github.com/Sendanor/nor-nopg#edit-type-by-instance-of-nopgtype)                |                                                                                  |
| `db.update(type, {$schema:{...}})`                                | [Edit type by plain object](https://github.com/Sendanor/nor-nopg#edit-type-by-plain-object)                                 |                                                                                  |
| `db.searchTypes({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"})` | [Search types](https://github.com/Sendanor/nor-nopg#search-types)                                                           |                                                                                  |
| `doc.createAttachment(data, {"content-type": "image/png"})`       | [Create attachments](https://github.com/Sendanor/nor-nopg#create-attachments)                                               |                                                                                  |
| `doc.searchAttachments()`                                         | [Search attachments](https://github.com/Sendanor/nor-nopg#search-attachments)                                               |                                                                                  |
| `doc.getAttachment("b58e402e-6b39-11e3-99c7-0800279ca880")`       | [Search attachments](https://github.com/Sendanor/nor-nopg#search-attachments)                                               |                                                                                  |
| `db.import('/path/to/tv4.js', {'$name': 'tv4'})`                  | [Import or upgrade module in database](https://github.com/Sendanor/nor-nopg#import-or-upgrade-module-in-database)           |                                                                                  |

### PostgreSQL and JavaScript name mapping

|                PostgreSQL               | JavaScript |                                                                                                                  Description                                                                                                                  |
| --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                    | `obj.$id`  | Property with leading `$` is mapped to the actual database table keyword                                                                                                                                                                      |
| `content->>'name'` or `content->'name'` | `obj.name` | Property without leading `$` is mapped to the property of the primary JSON data variable. It's `content` for `NoPg.Object`s and `meta` for other objects. The string or number operator is detected automatically from the type of the value. |

Connections and transactions
----------------------------

```javascript
nopg.start('postgres://user:pass@localhost/dbname').then(function(db) {
	/* ... */
	return db.commit();
});
```

You must call

* `db.commit()` to actually save any changes to the database; or 
* `db.rollback()` to cancel the transaction

Initialize database
-------------------

The required table structures and initial settings and data can be created by 
calling `db.init()`:

```javascript
nopg.start(PGCONFIG).init().then(function(db) {
	...
});
```

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

### Search objects

#### Search objects by id

```javascript
db.search()({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

#### Search objects by values

```javascript
db.search()({"hello": "world"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

#### Search objects by custom function

```javascript
db.search()(function(doc) {
	return doc.hello === 'world';
}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

#### Search objects by type string

```javascript
db.search("Foobar")().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

#### Search objects by type string with values

```javascript
db.search("Foobar")({"name":"hello"}).then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

#### Search objects by type

```javascript
db.search(type)().then(function(db) {
	var list = db.fetch();
	console.log("Found objects: " + util.inspect(list) );
});
```

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

#### Delete type by instance of `NoPg.Type`

```javascript
db.del(type).then(function(db) {
	console.log("Type deleted succesfully.");
});
```

#### Delete attachment

```javascript
db.del(attachment).then(function(db) {
	console.log("Attachment deleted succesfully.");
});
```

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

### Edit types

#### Edit type by instance of `NoPg.Type`

```javascript
type.schema = {..};
db.update(type).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

#### Edit type by plain object

```javascript
db.update(type, {schema:{...}}).then(function(db) {
	console.log("Successfully edited type: " + util.inspect(type) );
});
```

### Search types

```javascript
db.searchTypes({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found types: " + util.inspect(list) );
});
```

Attachments
-----------

### Create attachments

```javascript
doc.createAttachment(data, {"content-type": "image/png"}).then(function(db) {
	var file = db.fetch();
	console.log("Successfully created new attachment: " + util.inspect(file) );
});
```

### Search attachments

#### Search all attachments

```javascript
doc.searchAttachments().then(function(db) {
	var list = db.fetch();
	console.log("Found attachments: " + util.inspect(list) );
});
```

#### Get attachment by ID

```javascript
doc.getAttachment("b58e402e-6b39-11e3-99c7-0800279ca880").then(function(db) {
	var attachment = db.fetch();
	console.log("Found attachment: " + util.inspect(attachment) );
});
```

Libs
----

### Import or upgrade module in the database

```javascript
db.import('/path/to/tv4.js', {'name': 'tv4'}).then(function(db) {
	console.log("Library imported succesfully.");
});
```

Run tests
---------

```
PGCONFIG='pg://user:password@localhost/db' npm test
```
