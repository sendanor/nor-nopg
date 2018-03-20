"use strict";

/** Database schema creation functions */
var _Q = require('q');
var uuid = require('uuid');
var debug = require('nor-debug');
module.exports = [

	/** The views table */
	function(db) {
		var views_uuid = uuid();
		debug.assert(views_uuid).is('uuid');

		return db.query('CREATE SEQUENCE views_seq')
			.query(['CREATE TABLE IF NOT EXISTS views (',
					"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('"+views_uuid+"', nextval('views_seq'::regclass)::text),",
					'	types_id uuid REFERENCES types,',
					'	type text NOT NULL,',
					'	name text NOT NULL,',
					'	meta json NOT NULL,',
					'	active BOOLEAN NOT NULL DEFAULT TRUE,',
					'	created timestamptz NOT NULL default now(),',
					'	modified timestamptz NOT NULL default now()',
					')'
				].join('\n'))
			.query('ALTER SEQUENCE views_seq OWNED BY views.id')
			.query('CREATE INDEX views_types_id ON views (types_id)')
			.query('CREATE INDEX views_types_id_name ON views (types_id,name)')
			.query('CREATE INDEX views_type ON views (type)')
			.query('CREATE INDEX views_type_name ON views (type,name)')
			.query('CREATE UNIQUE INDEX ON views USING btree(types_id, name);')
			.query('CREATE TRIGGER views_modified BEFORE UPDATE ON views FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)')
			;
	},

	/** Create triggers for [tcn extension](https://www.postgresql.org/docs/9.3/static/tcn.html)
	 */
	function(db) {
		var queries = [
		'DROP TRIGGER IF EXISTS views_tcn_trigger ON views',
		'CREATE TRIGGER views_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON views FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()'
		];
		return queries.map(function(q) {
			return db.query(q);
		}).reduce(_Q.when, _Q(db));
	}

];
/* EOF */
