/** Database schema creation functions */
"use strict";
var NoPg = require('nor-nopg');
module.exports = [

	/** Create PostgreSQL function `get_documents(data json, type json)` which returns the contents for
	 * the property `$documents` based on provided specification.
	 */
	function(db) {

		/** Fetch external documents
		 * @param data {} 
		 * @param config {} 
		 * @param plv8 {} 
		 * @param ERROR {} 
		 * @param WARNING {} 
		 */
		function get_documents(data, config, plv8, ERROR, WARNING) {

			function get_document(id, fields) {
				fields = (fields || [{'query':'*'}]);

				var map = {};

				var obj = plv8.execute("SELECT "+fields.map(function(f, i) {
					var k;
					if(f.key) {
						k = 'p__' + i;
						map[k] = f;
						return f.query + ' AS ' + k;
					} else {
						return f.query;
					}
				}).join(', ')+" FROM documents WHERE id = $1 LIMIT 1", [id])[0];

				if(!obj) {
					return obj;
				}

				Object.keys(obj).forEach(function(key) {
					if(!map.hasOwnProperty(key)) {
						return;
					}

					var spec = map[key];
					if(!is_object(spec)) {
						return error('mapped resource missing');
					}
					if(!is_string(spec.key)) {
						return error('key missing');
					}
					var value = obj[key];
					delete obj[key];

					if(is_string(spec.datakey)) {
						if(!obj[spec.datakey]) {
							obj[spec.datakey] = {};
						}
						obj[spec.datakey][spec.key] = value;
					} else {
						obj[spec.key] = value;
					}
				});

				return obj;
			}

			function error(msg) {
				plv8.elog(ERROR, msg);
			}

			function warn(msg) {
				plv8.elog(WARNING, msg);
			}

			function is_object(a) {
				return a && (typeof a === 'object');
			}

			function is_array(a) {
				return a && (a instanceof Array);
			}

			function is_string(a) {
				return a && (typeof a === 'string');
			}

			function is_uuid(obj) {
				return /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(obj);
			}

			/** Returns property from object
			 * @returns The value of property named `current` of object `last`, otherwise undefined.
			 */
			function get_property_step(last, current) {
				return is_object(last) ? last[current] : undefined;
			}

			/** Get value of property from provided object using a path.
			 * @param obj {object} The object from where to find the value.
			 * @param path {string} The path to the value in object.
			 * @returns {mixed} The value from the object at the end of path or `undefined` if any part is missing.
			 */
			function get_property(obj, path) {
				if(!is_object(obj)) { return error('get_property(obj, ...) not object: '+ obj); }
				if(!is_string(path)) { return error('get_property(..., path) not string: '+ path); }
				return path.split('.').reduce(get_property_step, obj);
			}

			/** Get PostgreSQL style property expression */
			function get_pg_prop(name) {

				if(name[0] === '$') {
					return name.substr(1);
				}

				var parts = name.split('.');

				if(parts.length === 1) {
					return "content->>'" + name + "'";
				}

				if(parts.length === 2) {
					return "content->'" + parts.join("'->>'") + "'";
				}

				return "content->'" + parts.slice(0, parts.length-1).join("'->'") + "'->>'" + parts[parts.length-1] + "'";
			}

			/** Execute query for document expressions
			 * @param parent {object} The parent document object
			 * @param prop {string} The name of the property where results are saved in the parent
			 * @param type_name {string} The name of the type of related documents
			 * @param type_prop {string} The property name in the related document for the UUID of parent
			 * @param fields {array} The fields in the related document that should be returned
			 */
			function expression_query(parent, prop, type_name, type_prop, fields) {

				fields = (fields || [{'query':'*'}]);

				var map = {};

				var query = "SELECT "+fields.map(function(f, i) {
					var k;
					if(f.key) {
						k = 'p__' + i;
						map[k] = f;
						return f.query + ' AS ' + k;
					} else {
						return f.query;
					}
				}).join(', ')+" FROM documents WHERE type = $1 AND "+get_pg_prop(type_prop)+" = $2";

				var rows = plv8.execute(query, [type_name, parent.id]);

				if(!is_array(rows)) {
					return rows;
				}

				var errors = [];

				rows = rows.map(function(obj) {
					Object.keys(obj).forEach(function(key) {
						if(!map.hasOwnProperty(key)) {
							return;
						}
						var spec = map[key];
						if(!is_object(spec)) {
							errors.push( error('mapped resource missing') );
							return;
						}
						if(!is_string(spec.key)) {
							errors.push( error('key missing') );
							return;
						}
						var value = obj[key];
						delete obj[key];

						if(is_string(spec.datakey)) {
							if(!obj[spec.datakey]) {
								obj[spec.datakey] = {};
							}
							obj[spec.datakey][spec.key] = value;
						} else {
							obj[spec.key] = value;
						}
					});
					return obj;
				});

				if(errors.length >= 1) {
					return errors.shift();
				}

				return rows;
			}

			/** Get document(s) by expression */
			function fetch_objects_by_expression(data, prop, fields, expression) {
				if(!is_object(data)) { return error('fetch_objects_by_expression(data, ..., ...) not object: '+ data); }
				if(!is_string(prop)) { return error('fetch_objects_by_expression(..., prop, ...) not string: '+ prop); }
				if(!is_string(expression)) { return warn('Expression was not string: {' + expression + '}, typeof ' + (typeof expression)); }

				prop = prop.trim();
				expression = expression.trim();

				var type_name, type_prop;
				var type_start = expression.indexOf('#');
				if(type_start >= 0) {
					type_name = expression.substr(0, type_start).trim();
					type_prop = expression.substr(type_start+1).trim();
				} else {
					type_name = expression;
				}

				if(!type_prop) {
					return error('No property name in expression: {'+ expression+'}');
				}

				var rows = expression_query(data, prop, type_name, type_prop, fields);
				if(!is_array(rows)) {
					return rows;
				}

				var warnings = [];

				if(!data.documents) {
					data.documents = {};
				}

				if(!data.documents.expressions) {
					data.documents.expressions = {};
				}

				if(!is_array(data.documents.expressions[prop])) {
					if(data.documents.expressions.hasOwnProperty(prop)) {
						data.documents.expressions[prop] = [data.documents.expressions[prop]];
					} else {
						data.documents.expressions[prop] = [];
					}
				}

				var id_list = data.documents.expressions[prop];

				rows.forEach(function(row) {
					var uuid = row.id;
					if(is_uuid(uuid)) {
						id_list.push(uuid);
						if(data.documents[uuid] === undefined) {
							data.documents[uuid] = row;
						//} else {
						//	warnings.push( warn('Document already fetched: ' + uuid) );
						}
					} else {
						warnings.push( warn('Document did not have UUID property: ' + JSON.stringify(row, null, 2) ) );
					}
				});

				if(warnings.length >= 1) {
					return warnings.shift();
				}
			}

			/** Get document by UUID */
			function fetch_object_by_uuid(data, prop, fields, uuid) {
				if(!is_object(data)) { return error('fetch_object_by_uuid(data, ..., ...) not object: '+ data); }
				if(!is_string(prop)) { return error('fetch_object_by_uuid(..., prop, ...) not string: '+ prop); }
				if(!is_uuid(uuid)) { return warn('Property ' + prop + ' was not uuid: ' + uuid); }
				if(data.documents[uuid] === undefined) {
					data.documents[uuid] = get_document(uuid, fields);
				} else {
					return warn('Document already fetched: ' + uuid);
				}
			}

			/* */
			function fetch_object(data, config) {
				var prop, fields;

				if(is_object(config)) {
					prop = config.prop;
					fields = config.fields;
				} else if(is_string(config)) {
					prop = config;
				}

				if(!is_string(prop)) {
					return error('property is not valid: ' + prop);
				}

				fields = fields ? fields : [{'query':'*'}];

				if(!is_array(fields)) {
					return error('fields are not valid: ' + fields);
				}

				var exp_start = prop.indexOf('{');
				var exp_end = prop.length-1;
				if( (exp_start >= 0) && (prop[exp_end] === '}') ) {
					return fetch_objects_by_expression(data, prop.substr(0, exp_start), fields, prop.substr(exp_start+1, exp_end-(exp_start+1)) );
				}

				var uuid = get_property(data, prop);

				if(is_array(uuid)) {
					// FIXME: This could be implemented with one query
					return uuid.forEach(fetch_object_by_uuid.bind(undefined, data, prop, fields));
				}

				return fetch_object_by_uuid(data, prop, fields, uuid);
			}

			// Check for bad input
			if(!is_object(data)) { return error("get_documents(data, ...) not object"); }
			if(!is_array(config)) { return error("get_documents(..., config) not array"); }

			// Populate documents from `config`
			data.documents = {};
			config.forEach( fetch_object.bind(undefined, data) );
			return data.documents;
		}

		return db.query('CREATE OR REPLACE FUNCTION get_documents(data json, config json) RETURNS json LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(get_documents, ["data", "config", "plv8", "ERROR", "WARNING"]));
	}

];
/* EOF */
