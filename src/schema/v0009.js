/** Database schema creation functions */
var NoPg = require('../index.js');
module.exports = [

	/*************************************   #4  **************************************************/



	/* #4 - CHECK constraint helper for tv4. Acceps json data column and types table id as arguments. */
	function(db) {

		function check_type(data, types_id, plv8, ERROR) {
			// Ignore typeless documents
			if (types_id === null) {
				return true;
			}

			// Load type info
			var type_row = plv8.execute("SELECT validator FROM types WHERE id = $1", [types_id])[0];
			var schema = type_row.json_schema;
			var validator_code = type_row.validator;
	
			// Validate JSON schema
			if (schema) {
				var tv4 = require('tv4');
				var result = tv4.validateResult(data, schema);
	
				if (result.error) {
					plv8.elog(ERROR, result.error);
				}
	
				if (result.valid === false) {
					return false;
				}
			}
	
			// Run the validator
			if (validator_code) {
				//plv8.elog(NOTICE, "validator_code is " + JSON.stringify(validator_code) );
				var validator = new Function("return (" + validator_code + ")");
				if (validator()(data) === false) {
					plv8.elog(ERROR, "Type validation failed");
					return false;
				}
			}
			
			return true;
		}

		return db.query('CREATE OR REPLACE FUNCTION check_type(data json, types_id uuid) RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(check_type, ["data", "types_id", "plv8", "ERROR"]));
	}

];
/* EOF */
