#!/bin/sh -x

set -e

export DEBUG_NOPG=true
export NOPG_TIMEOUT=150000
export PGCONFIG="$(./node_modules/.bin/nor-pgrunner create)"

#psql "$PGCONFIG" < scripts/cleanup.sql;

psql "$PGCONFIG" -c 'CREATE EXTENSION plv8;'
psql "$PGCONFIG" -c 'CREATE EXTENSION "uuid-ossp";'
psql "$PGCONFIG" -c 'CREATE EXTENSION tcn;'
psql "$PGCONFIG" -c 'CREATE EXTENSION moddatetime;'

./src/bin/nopg.js -v init
npm -s test

./node_modules/.bin/nor-pgrunner destroy
