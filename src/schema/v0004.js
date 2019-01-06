/** Database schema creation functions */
import NoPg from 'nor-nopg';
import uuid from 'uuid/v4';
import debug from '@norjs/debug';

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
	},

	/** The json documents */
	function(db) {

		var documents_uuid = uuid();
		debug.assert(documents_uuid).is('uuid');

		return db.query('CREATE SEQUENCE documents_seq')
			.query([
					'CREATE TABLE IF NOT EXISTS documents (',
					"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('"+documents_uuid+"', nextval('documents_seq'::regclass)::text),",
					'	content json NOT NULL,',
					'	types_id uuid REFERENCES types,',
					'	created timestamptz NOT NULL default now(),',
					'	modified timestamptz NOT NULL default now(),',
					'	CHECK (check_type(content, types_id))',
					')'
				].join('\n'))
			.query('ALTER SEQUENCE documents_seq OWNED BY documents.id')
			.query('CREATE INDEX documents_type ON documents (types_id)')
			.query('CREATE TRIGGER types_modified BEFORE UPDATE ON types FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)');
	},

	/** #4 */
	function(db) {
		var attachments_uuid = uuid();
		debug.assert(attachments_uuid).is('uuid');

		return db.query('CREATE SEQUENCE attachments_seq')
			.query([
				'CREATE TABLE IF NOT EXISTS attachments (',
				"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('"+attachments_uuid+"', nextval('attachments_seq'::regclass)::text),",
				'	documents_id uuid NOT NULL REFERENCES documents ON DELETE CASCADE,',
				'	content bytea NOT NULL,',
				'	meta json,',
				'	created timestamptz NOT NULL default now(),',
				'	modified timestamptz NOT NULL default now()',
				')'].join('\n'))
			.query('ALTER SEQUENCE attachments_seq OWNED BY attachments.id')
			.query('CREATE TRIGGER attachments_modified BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)');
	}

];
/* EOF */
