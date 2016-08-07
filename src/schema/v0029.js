/** Database schema creation functions */
"use strict";
var _Q = require('q');
module.exports = [

	/** Create triggers for [tcn extension](https://www.postgresql.org/docs/9.3/static/tcn.html)
	 */
	function(db) {
		var queries = [
		'DROP TRIGGER IF EXISTS documents_tcn_trigger ON documents',
		'CREATE TRIGGER documents_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()',
		'DROP TRIGGER IF EXISTS dbversions_tcn_trigger ON dbversions',
		'CREATE TRIGGER dbversions_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON dbversions FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()',
		'DROP TRIGGER IF EXISTS types_tcn_trigger ON types',
		'CREATE TRIGGER types_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON types FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()',
		'DROP TRIGGER IF EXISTS attachments_tcn_trigger ON attachments',
		'CREATE TRIGGER attachments_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON attachments FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()',
		'DROP TRIGGER IF EXISTS libs_tcn_trigger ON libs',
		'CREATE TRIGGER libs_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON libs FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()'
		];
		return queries.map(function(q) {
			return db.query(q);
		}).reduce(_Q.when, _Q(db));
	}

];
/* EOF */
