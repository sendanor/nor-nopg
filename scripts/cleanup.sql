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
DROP FUNCTION tv4.validateresult(json,json);
DROP SCHEMA tv4;
