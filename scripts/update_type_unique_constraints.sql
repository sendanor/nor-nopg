CREATE OR REPLACE FUNCTION update_type_unique_constraints() RETURNS TRIGGER LANGUAGE plv8 AS $js$

	// Have indices changed?
	if (NEW.meta.unique === OLD.meta.unique) {
		return;
	}

	var typesId = NEW.id;
	plv8.elog(NOTICE, 'types_id', typesId);

	function paths(doc, path) {
		path = path || [];

		if (doc === undefined) {
			return [];
		}

		// Marked
		if (doc === true) {
			return [path];
		}

		// Recurse to subobject
		if (typeof(doc) === 'object') {

			return Object.keys(doc).map(function (k) {
				return paths(doc[k], path.concat(k));
			}).reduce(function(coll, x) {
				return coll.concat(x);
			}, []);

		}

		return [];
	};

	function uniqueIndexName(path) {
		return path.reduce(function (str, x) {
			return str + "_" + x;
		}, "unique") + "_idx";
	};

	function jsonLookupString(path) {
		return path.reduce(function (str, x) {
			return str + "->'" + x + "'";
		}, "content");
	};

	// Drop old indices
	var oldIndexPaths = paths(OLD.meta.unique);
	oldIndexPaths.forEach(function(p){
		var name = uniqueIndexName(p);
		plv8.elog(INFO, 'DROP INDEX', name);
		plv8.execute('DROP INDEX IF EXISTS ' + name);
	});

	// Create new indices
	var newIndexPaths = paths(NEW.meta.unique);
	newIndexPaths.forEach(function(p){
		var name = uniqueIndexName(p);
		plv8.elog(INFO, 'CREATE UNIQUE INDEX', name);
		var lookupStr = jsonLookupString(p);
		var query = 'CREATE UNIQUE INDEX ' + name + ' ON documents (((' + lookupStr + ")::text)) WHERE types_id = '" + typesId + "'";
		//plv8.elog(NOTICE, 'query:', query);
		plv8.execute(query);
	});

$js$;
