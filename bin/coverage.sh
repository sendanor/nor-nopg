#!/usr/bin/env bash

if uname -s|grep -iq Darwin; then
    pkg_root_dir="$(dirname "$(dirname "$0")")"
else
    pkg_root_dir="$(dirname "$(dirname "$(readlink -e "$0")")")"
fi

set -x
cd "$pkg_root_dir"

# Disable debug logs to stdout in nor-debug
export DEBUG_USE_CONSOLE_LOG=false
export DEBUG_USE_CONSOLE_INFO=false
export DEBUG_ENABLE_COLORS=false

mkdir -p ./coverage/
./node_modules/.bin/mocha -R mocha-lcov-reporter tests/test-*.js > ./coverage/coverage_temp.lcov

sed 's,SF:,SF:src/,' ./coverage/coverage_temp.lcov > ./coverage/coverage.lcov

cat ./coverage/coverage.lcov|./node_modules/coveralls/bin/coveralls.js
