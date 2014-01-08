/** Database schema creation functions */
var NoPg = require('../index.js');
module.exports = [

	/** Function for checking that only valid javascript goes into types.validator column */
	function(db) {
		function check_javascript_function(js, plv8, ERROR) {
			var fun;
			try {
				// We'll check only positive input
				if(js) {
					fun = (new Function('return (' + js + ')'))();
					if(! (fun && (fun instanceof Function)) ) {
						throw TypeError("Input is not valid JavaScript function: " + (typeof fun) + ": " + fun);
					}
				}
			} catch (e) {
				plv8.elog(ERROR, e);
				return false;
			}
			return true;
		}
		return db.query('CREATE OR REPLACE FUNCTION check_javascript_function(js text) RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(check_javascript_function, ['js', 'plv8', 'ERROR']));
	},

	/**
	 * Type of json documents. There can be tought of like "buckets". You can e.g. fetch all stuff of type x easily.
	 * There is a manually generated "namespace" UUID for UUIDv5 generator
	 */
	function(db) {
		return db.query('ALTER TABLE types DROP CONSTRAINT IF EXISTS types_validator_check')
		         .query('ALTER TABLE types ADD CONSTRAINT types_validator_check CHECK (check_javascript_function(validator))');
	},

	/* CHECK constraint helper for tv4. Acceps json data column and types table id as arguments. */
	function(db) {

		function check_type(data, types_id, plv8, ERROR) {
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
				var validator = (new Function("return (" + validator_code + ")"))();
				if(validator(data) !== true) {
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
