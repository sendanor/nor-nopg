/** Database schema creation functions */
var NoPg = require('nor-nopg');
module.exports = [

	/** Create PostgreSQL function `get_documents(data json, type json)` which returns the contents for
	 * the property `$documents` based on provided specification.
	 */
	function(db) {

		function get_documents(data, config, plv8, ERROR, WARNING) {

			function get_document(id) {
				return plv8.execute("SELECT * FROM documents WHERE id = $1 LIMIT 1", [id])[0];
			}

			function get_type(id) {
				return plv8.execute("SELECT * FROM types WHERE id = $1 LIMIT 1", [id])[0];
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

			/** Get document by UUID */
			function fetch_object_by_uuid(data, prop, uuid) {
				if(!is_object(data)) { return error('fetch_object_by_uuid(data, ..., ...) not object: '+ data); }
				if(!is_string(prop)) { return error('fetch_object_by_uuid(..., prop, ...) not string: '+ prop); }
				if(!is_uuid(uuid)) { return warn('Property ' + prop + ' was not uuid: ' + uuid); }
				if(data.documents[uuid] === undefined) {
					data.documents[uuid] = get_document(uuid);
				} else {
					return warn('Document already fetched: ' + uuid);
				}
			}

			/* */
			function fetch_object(data, prop) {
				var uuid = get_property(data, prop);
				if(is_array(uuid)) {
					return uuid.forEach(fetch_object_by_uuid.bind(undefined, data, prop));
				}
				return fetch_object_by_uuid(data, prop, uuid);
			}

			// Check for bad input

			if(!is_object(data)) { return error("get_documents(data, ...) not object"); }
			if(!is_array(config)) { return error("get_documents(..., config) not array"); }

			//var types_id = data.types_id;
			//if(!is_uuid(types_id)) { return error("data.types_id not valid UUID: " + types_id); }

			// Get document type
			//var type = get_type(types_id);
			//if(!is_object(type)) { return error("type not valid object: " + type); }

			//var relations = type.relations || {};
			//if(!is_object(relations)) { return error("type.relations not valid object: " + relations); }

			// Populate documents from `config`
			data.documents = {};
			config.forEach( fetch_object.bind(undefined, data) );
			return data.documents;
		}

		return db.query('CREATE OR REPLACE FUNCTION get_documents(data json, config json) RETURNS json LANGUAGE plv8 VOLATILE AS ' + NoPg._escapeFunction(get_documents, ["data", "config", "plv8", "ERROR", "WARNING"]));
	}

];
/* EOF */
