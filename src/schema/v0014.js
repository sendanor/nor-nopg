/** Database schema creation functions */
/*global ERROR*/

var NoPg = require('../index.js');
module.exports = [

	/** Function caller for predicate functions */
	function(db) {
		function call_func(data, fun, params) {
			try {

				// Parse data
				if(!(data && (data instanceof Array))) {
					throw new TypeError("First argument is not an array");
				}

				// Parse fun
				if(fun.substr(0, 8) === 'function') {
					// FIXME: This is the same code as in ../fun.js -- should be reused from there.
					fun = new Function('return (' + fun + ')')();
				} else {
					throw new TypeError("Second argument is not valid serialized function");
				}

				// Parse params
				if(!(params && (params instanceof Array))) {
					throw new TypeError("Third argument is not an array");
				}

				return fun.apply(undefined, [].concat(data).concat(params) );

			} catch (e) {
				plv8.elog(ERROR, e);
				return;
			}
		}
		return db.query('CREATE SCHEMA IF NOT EXISTS nopg')
			.query('CREATE OR REPLACE FUNCTION nopg.call_func(data json, fun json, params json) RETURNS json LANGUAGE plv8 STABLE AS ' + NoPg._escapeFunction(call_func, ["data", "fun", "params"]) );
	}

];
/* EOF */
