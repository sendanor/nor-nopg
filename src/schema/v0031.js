/** Database schema creation functions */
"use strict";
import NoPg from 'nor-nopg';
import debug from '@norjs/debug';
import ARRAY from 'nor-array';
import _Q from 'q';

module.exports = [

	/** Create triggers for [tcn extension](https://www.postgresql.org/docs/9.3/static/tcn.html)
	 */
	function(db) {
		return db.query('SELECT name FROM types WHERE name IS NOT NULL').then(function(db) {
			var types = db.fetch();
			debug.assert(types).is('array');

			var queries = ARRAY(types).map(function step_builder(type) {
				if(type && type.name) {
					return NoPg.createTriggerQueriesForType(type.name);
				}
				return [];
			}).reduce(function(a, b) {
				return a.concat(b);
			}, []);

			return queries.map(function(q) {
				return db.query(q);
			}).reduce(_Q.when, _Q(db));
		});
	}

];
/* EOF */
