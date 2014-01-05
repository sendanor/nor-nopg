/** Database schema creation functions */

module.exports = [

	/** Used to insert documents */
	function(db) {
		return db.query([
			'CREATE OR REPLACE FUNCTION get_type_id(name text) RETURNS uuid LANGUAGE SQL AS $$',
			'SELECT id FROM types WHERE name = $1',
			'$$'
		].join('\n'));
	}

];
/* EOF */
