#!/usr/bin/env bash

if uname -s|grep -iq Darwin; then
    pkg_root_dir="$(dirname "$(dirname "$0")")"
else
    pkg_root_dir="$(dirname "$(dirname "$(readlink -e "$0")")")"
fi

set -x
cd "$pkg_root_dir"

mkdir -p ./coverage/
mocha -R mocha-lcov-reporter tests/test-*.js > ./coverage/coverage_temp.lcov

sed 's,SF:,SF:lib/,' ./coverage/coverage_temp.lcov > ./coverage/coverage.lcov

cat ./coverage/coverage.lcov|coveralls
