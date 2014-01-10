-- 
-- Deletes everything, do not use in production!
-- 

DROP TABLE IF EXISTS dbversion;
DROP TABLE IF EXISTS dbversions;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS libs;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS objects;
DROP TABLE IF EXISTS types;

DROP FUNCTION db_version();
DROP FUNCTION plv8_init();
DROP FUNCTION tv4.validateResult(json,json);
DROP FUNCTION check_javascript(js text);
DROP FUNCTION check_type(data json, types_id uuid);
DROP FUNCTION check_javascript_function(js text);

DROP SCHEMA tv4;
