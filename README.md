nor-nopg
========

NoPostgreSQL Client Module for Sendanor NoSQL Server

Usage
-----

```javascript
var nopg = require('nor-nopg');
```

Database Schema
---------------

![ERS](gfx/ers.png "ERS")

Transactions
------------

```javascript
nopg.start('postgres://user:pass@localhost/dbname').then(function(db) {
	/* ... */
	return db.commit();
});
```

You must call `db.commit()` to actually save any changes to the database.

Objects
-------

### Creating objects

```javascript
db.create({"hello":"world"}).then(function(db) {
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

### Searching objects

```javascript
```

### Deleting objects

```javascript
```

Types
-----

### Creating types

```javascript
```

### Creating objects with type

```javascript
```

### Editing objects by type

```javascript
```

### Searching objects by type

```javascript
```

### Deleting objects by type

```javascript
```

### Editing types

```javascript
```

### Deleting types

```javascript
```

Attachments
-----------

### Creating attachments

```javascript
```

### Searching attachments

```javascript
```

### Deleting attachments

```javascript
```

Libs
----

### Importing/Upgrading modules into database

```javascript
```

