/** Database schema creation functions */

var NoPg = require('../index.js');
module.exports = [

	/** Rename columns to `modified` from `updated` */
	function rename_to_modified(db) {
		return db.query('ALTER TABLE documents RENAME COLUMN updated TO modified')
		         .query('ALTER TABLE dbversions RENAME COLUMN updated TO modified')
	}

];
/* EOF */
