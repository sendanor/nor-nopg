/** Database schema creation functions */

var NoPg = require('../index.js');
module.exports = [

	/* Setup silent CHECK constraint helper for tv4. Acceps json data column and types table id as arguments. */
	function(db) {

		function check_type_silent(data, types_id, plv8) {
			// Ignore typeless documents
			if (types_id === null) {
				return true;
			}

			// Load type info
			var type_row = plv8.execute("SELECT * FROM types WHERE id = $1", [types_id])[0];
			var schema = type_row.schema;
			var validator_code = type_row.validator;

			// Validate JSON schema
			if (schema) {
				var tv4 = require('tv4');
				var result = tv4.validateResult(data, schema);

				if (result.valid === false) {
					return false;
				}
			}

			// Run the validator
			if (validator_code) {
				var validator = (new Function("return (" + validator_code + ")"))();
				if(validator(data) !== true) {
					return false;
				}
			}

			return true;
		}

		return db.query('CREATE OR REPLACE FUNCTION check_type_silent(data json, types_id uuid) RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(check_type_silent, ["data", "types_id", "plv8"]));
	},

	/** Add column `type` to table `documents` to improve performance of queries */
	function add_type(db) {
		return db.query('ALTER TABLE documents ADD COLUMN type text')
		         .query('CREATE INDEX documents_type_index ON documents (type)')
		         .query("UPDATE documents SET type = get_type(types_id)->>'name'"+
		                " WHERE types_id IS NOT NULL AND check_type_silent(row_to_json(ROW(documents.*)), types_id)");
	}

];
/* EOF */
