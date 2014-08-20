/** Database schema creation functions */
module.exports = [

	/** To get JSON object of the type */
	function(db) {
		return db.query([
			'CREATE OR REPLACE FUNCTION get_type(id uuid) RETURNS json LANGUAGE SQL AS $$',
			'SELECT row_to_json(t.*) FROM types AS t WHERE t.id = $1',
			'$$'
		].join('\n'));
	}

];
/* EOF */
