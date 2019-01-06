#!/bin/bash -x

test="$1"

set -e

function finish {
	./node_modules/.bin/norjs-pgrunner destroy
}
trap finish EXIT

export DEBUG_NOPG=true
export NOPG_TIMEOUT=2000
export PGCONFIG="$(./node_modules/.bin/norjs-pgrunner create)"

#psql "$PGCONFIG" < scripts/cleanup.sql;

psql "$PGCONFIG" -c 'CREATE EXTENSION plv8;'
psql "$PGCONFIG" -c 'CREATE EXTENSION "uuid-ossp";'
psql "$PGCONFIG" -c 'CREATE EXTENSION tcn;'
psql "$PGCONFIG" -c 'CREATE EXTENSION moddatetime;'

./bin/nopg.sh -v init

if test "x$test" = x; then
	npm -s test
else
	npm -s run test-spec -- --grep "$test"
fi
