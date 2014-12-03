/** Database schema creation functions */

var NoPg = require('../index.js');
module.exports = [

	/** Function caller for predicate functions */
	function(db) {
		function call_func(data, fun, params, plv8, DEBUG1, DEBUG2, DEBUG3, DEBUG4, DEBUG5, LOG, INFO, NOTICE, WARNING, ERROR) {
			try {

				// Prepare context
				var context = { 'plv8': plv8, 'DEBUG1': DEBUG1, 'DEBUG2': DEBUG2, 'DEBUG3': DEBUG3, 'DEBUG4': DEBUG4, 'DEBUG5': DEBUG5, 'LOG': LOG,
					'INFO': INFO, 'NOTICE': NOTICE, 'WARNING': WARNING, 'ERROR': ERROR };

				// Parse data
				if(!(data && (data instanceof Array))) {
					throw new TypeError("First argument is not an array");
				}

				// Parse fun
				if(fun.substr(0, 8) === 'function') {
					// FIXME: This is the same code as in nor-function -- should be reused from there.
					fun = new Function('return (' + fun + ')')();
				} else {
					throw new TypeError("Second argument is not valid serialized function");
				}

				// Parse params
				if(!(params && (params instanceof Array))) {
					throw new TypeError("Third argument is not an array");
				}

				return fun.apply(context, [].concat(data).concat(params) );

			} catch (e) {
				plv8.elog(ERROR, e);
				return;
			}
		}
		return db.query('CREATE SCHEMA IF NOT EXISTS nopg')
			.query('CREATE OR REPLACE FUNCTION nopg.call_func(data json, fun json, params json) RETURNS json LANGUAGE plv8 STABLE AS ' + NoPg._escapeFunction(call_func,
				["data", "fun", "params", "plv8", "DEBUG1", "DEBUG2", "DEBUG3", "DEBUG4", "DEBUG5", "LOG", "INFO", "NOTICE", "WARNING", "ERROR"]) );
	}

];
/* EOF */
