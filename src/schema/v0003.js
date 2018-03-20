/** Database schema creation functions */
var uuid = require('uuid/v4');
var debug = require('nor-debug');

module.exports = [

	/*************************************   #3  **************************************************/

	/** #3
	 * Type of json documents. There can be tought of like "buckets". You can e.g. fetch all stuff of type x easily.
	 * There is a manually generated "namespace" UUID for UUIDv5 generator
	 */
	function(db) {
		var types_uuid = uuid();
		debug.assert(types_uuid).is('uuid');
		return db.query('CREATE SEQUENCE types_seq')
			.query([
				'CREATE TABLE IF NOT EXISTS types (',
				"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('"+types_uuid+"', nextval('types_seq'::regclass)::text),",
				'	name text,',
				'	schema json,',
				'	validator text,',
				'	meta json,',
				'	created timestamptz NOT NULL default now(),',
				'	modified timestamptz NOT NULL default now(),',
				'	CHECK (check_javascript(validator))',
				')'].join('\n'))
			.query(	'ALTER SEQUENCE types_seq OWNED BY types.id');
	}


];
/* EOF */
