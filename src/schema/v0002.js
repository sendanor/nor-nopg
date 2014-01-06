/** Database schema creation functions */
var NoPg = require('../index.js');
module.exports = [

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
		function plv8_init(plv8, LOG, INFO, WARNING, ERROR) {
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

		return db.query('CREATE OR REPLACE FUNCTION plv8_init() RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(plv8_init, ["plv8", "LOG", "INFO", "WARNING", "ERROR"]));
	},

	/** #2 - Namespace and sql function wrapper for tv4 */
	function(db) {
		function tv4_validateResult(data, schema) {
			var tv4 = require('tv4');
			return tv4.validateResult(data, schema);
		}
		return db.query('CREATE SCHEMA IF NOT EXISTS tv4')
			.query('CREATE OR REPLACE FUNCTION tv4.validateResult(data json, schema json) RETURNS json LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(tv4_validateResult, ["data", "schema"]) );
	}

];
/* EOF */
