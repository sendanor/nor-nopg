/** Database schema creation functions */
"use strict";
var NoPg = require('nor-nopg');
module.exports = [

	/** Create triggers for [tcn extension](https://www.postgresql.org/docs/9.3/static/tcn.html)
	 */
	function(db) {
		var db_ = db.query('CREATE TRIGGER   documents_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON documents   FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()')
		            .query('CREATE TRIGGER  dbversions_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON dbversions  FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()')
		            .query('CREATE TRIGGER       types_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON types       FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()')
		            .query('CREATE TRIGGER attachments_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON attachments FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()')
		            .query('CREATE TRIGGER        libs_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON libs        FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()');
		return db_;
	}

];
/* EOF */
