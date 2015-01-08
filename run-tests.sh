#!/bin/sh

set -e

export DEBUG_NOPG=true

export PGCONFIG='postgresql://nopgtest:ng8SxY7ugQCmXwvu5sSd4C9hdvYboX4d@localhost/nopgtest'

psql "$PGCONFIG" < scripts/cleanup.sql;

./src/bin/nopg.js -v init

npm test
