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

|  Name  |       Description        |                             Example                             |
| ------ | ------------------------ | --------------------------------------------------------------- |
| `NoPg` | `NoPg` module            | `var NoPg = require('nor-nopg');`                               |
| `db`   | `NoPg` instance          | `NoPg.start(...).then(function(db) { ... });`                   |
| `doc`  | `NoPg.Document` instance | `db.create()(...).shift().then(function(doc) { ... });`         |
| `type` | `NoPg.Type` instance     | `db.createType("name")().shift().then(function(type) { ... });` |

### Summary of available operations

|                            Short usage                            |                                                           Description                                                            |                                    Tested at                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `NoPg.start(...)`                                                 | [Get connection and start transaction](https://github.com/Sendanor/nor-nopg#connections-and-transactions)                        | [L42](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L42)   |
| `db.init()`                                                       | [Initialize database](https://github.com/Sendanor/nor-nopg#initialize-database)                                                  | [L15](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L15)   |
| `db.create()({"hello":"world"})`                                  | [Create document without type](https://github.com/Sendanor/nor-nopg#create-document-without-type)                                | [L41](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L41)   |
| `db.create("MyType")({"hello":"world"})`                          | [Create document with type as string](https://github.com/Sendanor/nor-nopg#create-document-with-type-as-string)                  | [L57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57)   |
| `db.create(type)({"hello":"world"})`                              | [Create document with type as object](https://github.com/Sendanor/nor-nopg#create-document-with-type-as-object)                  | [L306](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L306) |
| `db.search()({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"})`    | [Search documents by id](https://github.com/Sendanor/nor-nopg#search-documents-by-id)                                            | [L156](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L156) |
| `db.search()({"hello": "world"})`                                 | [Search documents by values](https://github.com/Sendanor/nor-nopg#search-documents-by-values)                                    | [L130](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L130) |
| `db.search()(function(doc) { return doc.hello === 'world'; })`    | [Search documents by custom function](https://github.com/Sendanor/nor-nopg#search-documents-by-custom-function)                  |                                                                                  |
| `db.search("Foobar")()`                                           | [Search documents by type string](https://github.com/Sendanor/nor-nopg#search-documents-by-type-string)                          | [L185](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L185) |
| `db.search("Foobar")({"name":"hello"})`                           | [Search documents by type string with values](https://github.com/Sendanor/nor-nopg#search-documents-by-type-string-with-values)  | [L219](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L219) |
| `db.search(type)()`                                               | [Search documents by type](https://github.com/Sendanor/nor-nopg#search-documents-by-type)                                        |                                                                                  |
| `db.search(type)({"name":"hello"})`                               | [Search documents by type as string with values](https://github.com/Sendanor/nor-nopg#search-documents-by-type)                  | [L254](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L254) |
| `db.update(doc)`                                                  | [Edit document by instance of NoPg.Document](https://github.com/Sendanor/nor-nopg#edit-document-by-instance-of-nopgdocument)     | [L93](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L93)   |
| `db.update(doc, {"hello": "world"})`                              | [Edit document by plain document](https://github.com/Sendanor/nor-nopg#edit-document-by-plain-document)                          | [L74](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L74)   |
| n/a                                                               | [Edit documents by type](https://github.com/Sendanor/nor-nopg#edit-documents-by-type)                                            |                                                                                  |
| `db.del(doc)`                                                     | [Delete document by instance of NoPg.Document](https://github.com/Sendanor/nor-nopg#delete-document-by-instance-of-nopgdocument) | [L113](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L113) |
| n/a                                                               | [Delete documents by instance of NoPg.Type](https://github.com/Sendanor/nor-nopg#delete-documents-by-instance-of-nopgtype)       |                                                                                  |
| `db.del(type)`                                                    | [Delete type by instance of NoPg.Type](https://github.com/Sendanor/nor-nopg#delete-type-by-instance-of-nopgtype)                 | [L400](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L400) |
| `db.del(attachment)`                                              | [Delete attachment](https://github.com/Sendanor/nor-nopg#delete-attachment)                                                      |                                                                                  |
| `db.createType("Product")({"$schema":{"type":"object"}})`         | [Create type with name as string](https://github.com/Sendanor/nor-nopg#create-type-with-name-as-string)                          |                                                                                  |
| `db.createType()({"$schema":{"type":"object"}})`                  | [Create type without name](https://github.com/Sendanor/nor-nopg#create-type-without-name)                                        |                                                                                  |
| `db.update(type)`                                                 | [Edit type by instance of NoPg.Type](https://github.com/Sendanor/nor-nopg#edit-type-by-instance-of-nopgtype)                     |                                                                                  |
| `db.update(type, {$schema:{...}})`                                | [Edit type by plain object](https://github.com/Sendanor/nor-nopg#edit-type-by-plain-object)                                      |                                                                                  |
| `db.searchTypes({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"})` | [Search types](https://github.com/Sendanor/nor-nopg#search-types)                                                                |                                                                                  |
| `doc.createAttachment(data, {"content-type": "image/png"})`       | [Create attachments](https://github.com/Sendanor/nor-nopg#create-attachments)                                                    |                                                                                  |
| `doc.searchAttachments()`                                         | [Search attachments](https://github.com/Sendanor/nor-nopg#search-attachments)                                                    |                                                                                  |
| `doc.getAttachment("b58e402e-6b39-11e3-99c7-0800279ca880")`       | [Search attachments](https://github.com/Sendanor/nor-nopg#search-attachments)                                                    |                                                                                  |
| `db.import('/path/to/tv4.js', {'$name': 'tv4'})`                  | [Import or upgrade module in database](https://github.com/Sendanor/nor-nopg#import-or-upgrade-module-in-database)                |                                                                                  |

### PostgreSQL and JavaScript name mapping

|                PostgreSQL               | JavaScript |                                                                                                                  Description                                                                                                                  |
| --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                    | `obj.$id`  | Property with leading `$` is mapped to the actual database table column                                                                                                                                                                      |
| `content->>'name'` or `content->'name'` | `obj.name` | Property without leading `$` is mapped to the property of the primary JSON data variable. It's `content` for `NoPg.Document`s and `meta` for other objects. The string or number operator is detected automatically from the type of the value. |

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

Our promise implementation
--------------------------

We use an extended promise implementation which allows chaining of 
multiple methods together.

Under the hood we are using [`q` promises](https://github.com/kriskowal/q) 
which are extended using [`nor-extend`](https://github.com/sendanor/nor-extend). 

However these extended features are not required. You may use our promises 
just like any other q-promises.

### Example of chaining multiple asynchronic calls together

```javascript
NoPg.start(...).create("Group")({"name":"Bar"}).create("User")({"name":"Foo"}).then(function(db) {
	var group = db.fetch();
	var user = db.fetch();

	// ... do your magic at this point

	return db.commit();
}).fail(function(err) {
	console.error(err);
}).done();
```

About the PostgreSQL ORM Mapping
--------------------------------

The module has simple ORM mappings for all of our PostgreSQL tables.

| JavaScript constructor | PostgreSQL table | Default JSON column |
| ---------------------- | ---------------- | ------------------- |
| `NoPg.Document`        | `documents`      | `content`           |
| `NoPg.Type`            | `types`          | `meta`              |
| `NoPg.Attachment`      | `attachments`    | `meta`              |
| `NoPg.Lib`             | `libs`           | `meta`              |
| `NoPg.DBVersion`       | `dbversions`     | n/a                 |

### Using database constructors

These constructors will take an object and convert it to JavaScript instance 
of that PostgreSQL table row.

Example object:

```javascript
{
	"name": "Hello",
	"foo": "bar",
	"age": 10
	"$id": "8a567836-72be-11e3-be5d-0800279ca880",
	"$created": "",
	"$updated": ""
}
```

The special `$` in the name makes it possible to point directly to a column 
in PostgreSQL row.

Any other property points to the column in default JSON column.

For example a `obj.$meta.foo` in `NoPg.Type` instance has the same value as 
`obj.foo` unless the ORM instance has been changed by the user.

Documents
---------

### Create document

#### Create document without type

```javascript
db.create()({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new document: " + util.inspect(doc) );
});
```

#### Create document with type as string

```javascript
db.create("MyType")({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new document: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:57](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L57).

#### Create document with type as object

```javascript
db.create(type)({"hello":"world"}).then(function(db) {
	var doc = db.fetch();
	console.log("Successfully created new document: " + util.inspect(doc) );
});
```

### Search documents

#### Search documents by id

```javascript
db.search()({"$id": "b58e402e-6b39-11e3-99c7-0800279ca880"}).then(function(db) {
	var list = db.fetch();
	console.log("Found documents: " + util.inspect(list) );
});
```

#### Search documents by values

```javascript
db.search()({"hello": "world"}).then(function(db) {
	var list = db.fetch();
	console.log("Found documents: " + util.inspect(list) );
});
```

#### Search documents by custom function

```javascript
db.search()(function(doc) {
	return doc.hello === 'world';
}).then(function(db) {
	var list = db.fetch();
	console.log("Found documents: " + util.inspect(list) );
});
```

#### Search documents by type string

```javascript
db.search("Foobar")().then(function(db) {
	var list = db.fetch();
	console.log("Found documents: " + util.inspect(list) );
});
```

#### Search documents by type string with values

```javascript
db.search("Foobar")({"name":"hello"}).then(function(db) {
	var list = db.fetch();
	console.log("Found documents: " + util.inspect(list) );
});
```

#### Search documents by type

```javascript
db.search(type)().then(function(db) {
	var list = db.fetch();
	console.log("Found documents: " + util.inspect(list) );
});
```

### Edit documents

#### Edit document by instance of `NoPg.Document`

```javascript
doc.hello = "world";

db.update(doc).then(function(db) {
	console.log("Successfully edited document: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:93](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L93).

#### Edit document by plain document

```javascript
db.update(doc, {"hello": "world"}).then(function(db) {
	console.log("Successfully edited document: " + util.inspect(doc) );
});
```

Tested at [test-nopg.js:74](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L74).

#### Edit documents by type

```javascript
/* n/a */
```

### Delete documents

#### Delete document by instance of `NoPg.Document`

```javascript
db.del(doc).then(function(db) {
	console.log("Document deleted succesfully.");
});
```

Tested at [test-nopg.js:113](https://github.com/Sendanor/nor-nopg/blob/master/tests/test-nopg.js#L113).

#### Delete documents by instance of `NoPg.Type`

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

Database configurations can be set using PGCONFIG:

```
export PGCONFIG='pg://user:password@localhost/db'
```

The actual test can be run: `npm test`

You must delete the data if you need to run the test suite again for the same database:

```
psql -q db < scripts/cleanup.sql
```

***Please note:*** psql does not follow `PGCONFIG` environment variable!

Run lint test
-------------

`npm run lint`
