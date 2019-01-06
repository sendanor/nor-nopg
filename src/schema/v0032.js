"use strict";

/** Database schema creation functions */
import _Q from 'q';
import uuid from 'uuid';
import debug from '@norjs/debug';
module.exports = [

	/** The methods table */
	function(db) {
		var methods_uuid = uuid();
		debug.assert(methods_uuid).is('uuid');

		return db.query('CREATE SEQUENCE methods_seq')
			.query(['CREATE TABLE IF NOT EXISTS methods (',
					"	id uuid PRIMARY KEY NOT NULL default uuid_generate_v5('"+methods_uuid+"', nextval('methods_seq'::regclass)::text),",
					'	types_id uuid REFERENCES types,',
					'	type text NOT NULL,',
					'	name text NOT NULL,',
					'	body text NOT NULL,',
					'	meta json NOT NULL,',
					'	active BOOLEAN DEFAULT TRUE,',
					'	created timestamptz NOT NULL default now(),',
					'	modified timestamptz NOT NULL default now(),',
					'	CONSTRAINT active_not_false CHECK(active != false)',
					')'
				].join('\n'))
			.query('ALTER SEQUENCE methods_seq OWNED BY methods.id')
			.query('CREATE INDEX methods_types_id ON methods (types_id)')
			.query('CREATE INDEX methods_types_id_name ON methods (types_id,name)')
			.query('CREATE INDEX methods_type ON methods (type)')
			.query('CREATE INDEX methods_type_name ON methods (type,name)')
			.query('CREATE UNIQUE INDEX ON methods USING btree(types_id, name, active nulls LAST);')
			.query('CREATE TRIGGER methods_modified BEFORE UPDATE ON methods FOR EACH ROW EXECUTE PROCEDURE moddatetime (modified)')
			.query(
				[
	'CREATE OR REPLACE FUNCTION ensure_only_one_active_row_trigger()',
	'RETURNS trigger',
	'AS $function$',
	'BEGIN',
	  // Disable the currently enabled row
	"  IF (TG_OP = 'UPDATE') THEN",
	     // Nothing to do if updating the row currently enabled'
	"    IF (OLD.active = true AND OLD.name = NEW.name) THEN",
	'      RETURN NEW;',
	'    END IF;',
	"    EXECUTE format('UPDATE %I.%I SET active = null WHERE active = true AND name = %L;', TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD.name);",
	"    IF (OLD.name != NEW.name) THEN",
	"      EXECUTE format('UPDATE %I.%I SET active = null WHERE active = true AND name = %L;', TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.name);",
	'    END IF;',
	'  ELSE',
	"    EXECUTE format('UPDATE %I.%I SET active = null WHERE active = true AND name = %L;', TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.name);",
	'  END IF;',
	   // Enable new row
	'  NEW.active := true;',
	'  RETURN NEW;',
	'END;',
	'$function$',
	'LANGUAGE plpgsql'
				].join('\n')
			)
			.query('CREATE TRIGGER methods_only_one_active_row'+
				' BEFORE INSERT OR UPDATE OF active ON methods'+
				' FOR EACH ROW WHEN (NEW.active = true)'+
				' EXECUTE PROCEDURE ensure_only_one_active_row_trigger()'
			);
	},

	/** Create triggers for [tcn extension](https://www.postgresql.org/docs/9.3/static/tcn.html)
	 */
	function(db) {
		var queries = [
		'DROP TRIGGER IF EXISTS methods_tcn_trigger ON methods',
		'CREATE TRIGGER methods_tcn_trigger AFTER INSERT OR UPDATE OR DELETE ON methods FOR EACH ROW EXECUTE PROCEDURE triggered_change_notification()'
		];
		return queries.map(function(q) {
			return db.query(q);
		}).reduce(_Q.when, _Q(db));
	}

];
/* EOF */
