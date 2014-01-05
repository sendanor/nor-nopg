/** Database schema creation functions */
var NoPg = require('../index.js');
module.exports = [
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
		return db.query('CREATE OR REPLACE FUNCTION check_javascript(js text) RETURNS boolean LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(check_javascript));
	}
];
/* EOF */
