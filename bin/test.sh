#!/usr/bin/env bash
if uname -s|grep -iq Darwin; then
    pkg_root_dir="$(dirname "$(dirname "$0")")"
else
    pkg_root_dir="$(dirname "$(dirname "$(readlink -e "$0")")")"
fi
set -x
cd "$pkg_root_dir"
if test "x$ENABLE_COVERAGE" = x; then
    exec npm run -s test-spec
else
    if test -d ./src-cov/; then
        rm -rf ./src-cov/
    fi
    jscover ./src ./src-cov
    exec npm run -s test-coverage
fi
