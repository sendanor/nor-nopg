/** Database schema creation functions */
var _Q = require('q');
var uuid = require('node-uuid');
var debug = require('nor-debug');
module.exports = [

	/** The methods table */
	function(db) {
		var methods_uuid = uuid.v4();
		debug.assert(methods_uuid).is('uuid');

		return db.query('CREATE SEQUENCE methods_seq')
			.query([
					'CREATE TABLE IF NOT EXISTS methods (',
					"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('"+methods_uuid+"', nextval('methods_seq'::regclass)::text),",
					'	types_id uuid REFERENCES types,',
					'	type text NOT NULL,',
					'	name text NOT NULL,',
					'	body text NOT NULL,',
					'	meta json NOT NULL,',
					'	active BOOLEAN NOT NULL default TRUE,',
					'	created timestamptz NOT NULL default now(),',
					'	modified timestamptz NOT NULL default now()',
					')'
				].join('\n'))
			.query('ALTER SEQUENCE methods_seq OWNED BY methods.id')
			.query('CREATE INDEX methods_types_id ON methods (types_id)')
			.query('CREATE INDEX methods_types_id_name ON methods (types_id,name)')
			.query('CREATE INDEX methods_type ON methods (type)')
			.query('CREATE INDEX methods_type_name ON methods (type,name)')
			.query('CREATE TRIGGER methods_modified BEFORE UPDATE ON methods FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)');
	},

	/** Create triggers for [tcn extension](https://www.postgresql.org/docs/9.3/static/tcn.html)
	 */
	function(db) {
		var queries = [
		'DROP TRIGGER IF EXISTS methods_tcn_trigger ON methods',
		'CREATE TRIGGER methods_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON methods FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()'
		];
		return queries.map(function(q) {
			return db.query(q);
		}).reduce(_Q.when, _Q(db));
	}

];
/* EOF */
