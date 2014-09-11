/** Database schema creation functions */

var NoPg = require('../index.js');
module.exports = [

	/** Rename column `documents.modified` to `documents.updated` */
	function rename_modified(db) {
		return db.query('ALTER TABLE documents RENAME COLUMN modified TO updated');
	}

];
/* EOF */
