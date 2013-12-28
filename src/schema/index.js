/** Database schema creation functions */

function escape_function(f) {
	return '$js$\nreturn (' + f + ')()\n$js$';
}

module.exports = [

	/** #0 */
	function(db) {
		return db.query([
				'CREATE TABLE IF NOT EXISTS dbversion (',
				'    version integer PRIMARY KEY NOT NULL,',
				'    updated timestamptz NOT NULL default now()',
				')'].join('\n'))
			.query([
				'CREATE OR REPLACE FUNCTION db_version() RETURNS integer LANGUAGE SQL AS $$',
				'SELECT max(version) AS version FROM dbversion;',
				'$$'].join('\n'))
			.query([
				'CREATE OR REPLACE FUNCTION set_db_version(version integer) RETURNS void LANGUAGE SQL AS $$',
				'INSERT INTO dbversion (version) VALUES ($1);',
				'$$'].join('\n'));
	},

	/** #1 Function for checking that only valid javascript goes into libs table (01_js_library_environment.sql) */
	function(db) {
		function check_javascript() {
			var module = {'exports':{}};
			try {
				var fun = new Function("module", "exports", js);
				fun(module, module.exports);
			} catch (e) {
				plv8.elog(ERROR, e);
				return false;
			}
			return true;
		}
		return db.query('CREATE OR REPLACE FUNCTION check_javascript(js text) RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + escape_function(check_javascript));
	},

	/** #2 Table for storing JS libraries (01_js_library_environment.sql) */
	function(db) {
		return db.query('CREATE SEQUENCE libs_seq'
			).query([
				"CREATE TABLE IF NOT EXISTS libs (",
				"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('df4c8342-6be5-11e3-9eca-3c07543b96e1', nextval('libs_seq'::regclass)::text),",
				"	name text UNIQUE NOT NULL,",
				"	content text NOT NULL,",
				"	meta json,",
				"	created timestamptz NOT NULL default now(),",
				"	modified timestamptz NOT NULL default now(),",
				"	CHECK (check_javascript(content))",
				")"].join('\n')
			).query("ALTER SEQUENCE libs_seq OWNED BY libs.id"
			).query("CREATE TRIGGER libs_modified BEFORE UPDATE ON libs FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)");
	},

	/*
	 * plv8 environment initialization function
	 * - defines require (loads libs from libs table)
	 * http://pgxn.org/dist/plv8/doc/plv8.html#Start-up.procedure
	 * Don't forget to set plv8.start_proc = 'plv8_init' in postgresql.conf
	 */
	function(db) {
		function plv8_init() {
			plv8._modules = {};

			// Require function for loading libs
			this.require = function(name) {

				// Is the module already loaded?
				if (plv8._modules[name]) {
					return plv8._modules[name];
				}
	
				// Load the module
				var module = {'exports':{}};
				var code = plv8.execute("SELECT content FROM public.libs WHERE name = $1", [name])[0].content;
				(new Function("module", "exports", code))(module, module.exports);
			
				// Store the module
				plv8._modules[name] = module.exports;
				return plv8._modules[name];
			}; // this.require
			
			// Console logging for the libraries
			this.console = {
				"log": plv8.elog.bind(plv8, LOG),
				"info": plv8.elog.bind(plv8, INFO),
				"warn": plv8.elog.bind(plv8, WARNING),
				"error": plv8.elog.bind(plv8, ERROR)
			};
	
			return true;
		} // plv8_init

		return db.query('CREATE OR REPLACE FUNCTION plv8_init() RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + escape_function(plv8_init));
	},

	/** #2 - Namespace and sql function wrapper for tv4 */
	function(db) {
		function tv4_validateResult() {
			var tv4 = require('tv4');
			return tv4.validateResult(data, schema);
		}
		return db.query('CREATE SCHEMA IF NOT EXISTS tv4')
			.query('CREATE OR REPLACE FUNCTION tv4.validateResult(data json, schema json) RETURNS json LANGUAGE plv8 VOLATILE AS ' + escape_function(tv4_validateResult) );
	},

	/** #3
	 * Type of json objects. There can be tought of like "buckets". You can e.g. fetch all stuff of type x easily.
	 * There is a manually generated "namespace" UUID for UUIDv5 generator
	 */
	function(db) {
		return db.query('CREATE SEQUENCE types_seq')
			.query([
				'CREATE TABLE IF NOT EXISTS types (',
				"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('639a8bcf-06b1-4504-94fd-db0419a2db76', nextval('types_seq'::regclass)::text),",
				'	name text,',
				'	schema json,',
				'	validator text,',
				'	meta json,',
				'	created timestamptz NOT NULL default now(),',
				'	modified timestamptz NOT NULL default now(),',
				'	CHECK (check_javascript(validator))',
				')'].join('\n'))
			.query(	'ALTER SEQUENCE types_seq OWNED BY types.id');
	},

	/* #4 - CHECK constraint helper for tv4. Acceps json data column and types table id as arguments. */
	function(db) {

		function check_type() {
			// Ignore typeless objects
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

		return db.query('CREATE OR REPLACE FUNCTION check_type(data json, types_id uuid) RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + escape_function(check_type));
	},

	/** The json objects */
	function(db) {
		return db.query('CREATE SEQUENCE objects_seq')
			.query([
					'CREATE TABLE IF NOT EXISTS objects (',
					"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('10c9e34c-1ed9-4e3d-bc58-280baf2b0648', nextval('objects_seq'::regclass)::text),",
					'	content json NOT NULL,',
					'	types_id uuid REFERENCES types,',
					'	created timestamptz NOT NULL default now(),',
					'	modified timestamptz NOT NULL default now(),',
					'	CHECK (check_type(content, types_id))',
					')'
				].join('\n'))
			.query('ALTER SEQUENCE objects_seq OWNED BY objects.id')
			.query('CREATE INDEX objects_type ON objects (types_id)')
			.query('CREATE TRIGGER types_modified BEFORE UPDATE ON types FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)');
	},

	/** #4 */
	function(db) {
		return db.query('CREATE SEQUENCE attachments_seq')
			.query([
				'CREATE TABLE IF NOT EXISTS attachments (',
				"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('7ff10638-7ede-4748-8732-c602754c10cc', nextval('attachments_seq'::regclass)::text),",
				'	objects_id uuid NOT NULL REFERENCES objects ON DELETE CASCADE,',
				'	content bytea NOT NULL,',
				'	meta json,',
				'	created timestamptz NOT NULL default now(),',
				'	modified timestamptz NOT NULL default now()',
				')'].join('\n'))
			.query('ALTER SEQUENCE attachments_seq OWNED BY attachments.id')
			.query('CREATE TRIGGER attachments_modified BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)');
	},

	/** #5 - Used to insert objects */
	function(db) {
		return db.query([
			'CREATE OR REPLACE FUNCTION get_type(name text) RETURNS uuid LANGUAGE SQL AS $$',
			'SELECT id FROM types WHERE name = $1',
			'$$'
		].join('\n'));
	}

];
/* EOF */
