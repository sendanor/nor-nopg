/** Database schema creation functions */
var NoPg = require('nor-nopg');
module.exports = [

	/** Used to insert documents */
	function(db) {
		return db.query([
			'CREATE OR REPLACE FUNCTION get_type_id(name text) RETURNS uuid STABLE LANGUAGE SQL AS $$',
			'SELECT id FROM types WHERE name = $1',
			'$$'
		].join('\n'));
	},

	/** To get JSON object of the type */
	function(db) {
		return db.query([
			'CREATE OR REPLACE FUNCTION get_type(id uuid) RETURNS json STABLE LANGUAGE SQL AS $$',
			'SELECT row_to_json(t.*) FROM types AS t WHERE t.id = $1',
			'$$'
		].join('\n'));
	},

	/** Namespace and sql function wrapper for tv4 */
	function(db) {
		function tv4_validateResult(data, schema) {
			var tv4 = require('tv4');
			return tv4.validateResult(data, schema);
		}
		return db.query('CREATE SCHEMA IF NOT EXISTS tv4')
			.query('CREATE OR REPLACE FUNCTION tv4.validateResult(data json, schema json) RETURNS json LANGUAGE plv8 STABLE AS ' + NoPg._escapeFunction(tv4_validateResult, ["data", "schema"]) );
	},

	/** Create documents_created_index */
	function(db) {
		return db.query('CREATE INDEX documents_created_index ON documents (created)');
	},

	/** Create types_names_index */
	function(db) {
		return db.query('CREATE INDEX types_names_index ON types (name)');
	},

	/** Create documents_content_sid_index
	 * @FIXME: Until NoPG supports setting custom indexes we index "sid"
	 */
	function(db) {
		return db.query("CREATE INDEX documents_content_sid_index ON documents ((content->>'sid'))");
	}

];
/* EOF */
