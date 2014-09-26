/** Database schema creation functions */

var NoPg = require('../index.js');
module.exports = [

	/** Implement merge function to merge two objects for use in UPDATE */
	function(db) {
		function merge(a_, b_, plv8, ERROR) {

			function copy_properties(o, a) {
				Object.keys(a).forEach(function(k) {
					o[k] = a[k];
				});
				return o;
			}

			function copy(a, b) {
				return copy_properties(copy_properties({}, a), b);
			}

			try {
				return copy(a_, b_);
			} catch (e) {
				plv8.elog(ERROR, e);
				return;
			}
		}
		return db.query('CREATE SCHEMA IF NOT EXISTS nopg')
			.query('CREATE OR REPLACE FUNCTION nopg.merge(a json, b json) RETURNS json LANGUAGE plv8 STABLE AS ' + NoPg._escapeFunction(merge,
				["a", "b", "plv8", "ERROR"]) );
	}

];
/* EOF */
