/** Database schema creation functions */
var NoPg = require('nor-nopg');
var debug = require('nor-debug');
module.exports = [

	/** Create INDEXes */
	function(db) {
		return db.query('CREATE UNIQUE INDEX documents_id_index ON documents (id)')
		         .query('CREATE UNIQUE INDEX types_id_index ON types (id)')
		         .query('CREATE UNIQUE INDEX libs_id_index ON libs (id)')
		         .query('CREATE        INDEX attachments_documents_id_index ON attachments (documents_id)')
		         .query('CREATE UNIQUE INDEX attachments_id_index ON attachments (id)');
	},

];
/* EOF */
