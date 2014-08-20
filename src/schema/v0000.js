/** Database schema creation functions */
module.exports = [
	function(db) {
		return db.query([
				'CREATE TABLE IF NOT EXISTS dbversions (',
				'    version integer PRIMARY KEY NOT NULL,',
				'    updated timestamptz NOT NULL default now()',
				')'].join('\n'))
			.query([
				'CREATE OR REPLACE FUNCTION db_version() RETURNS integer LANGUAGE SQL AS $$',
				'SELECT max(version) AS version FROM dbversions;',
				'$$'].join('\n'))
			.query([
				'CREATE OR REPLACE FUNCTION set_db_version(version integer) RETURNS void LANGUAGE SQL AS $$',
				'INSERT INTO dbversions (version) VALUES ($1);',
				'$$'].join('\n'));
	}
];

/* EOF */
