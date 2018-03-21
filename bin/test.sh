#!/usr/bin/env bash
set -x
if test "x$ENABLE_COVERAGE" = x; then
    exec npm run -s test-spec
else
    jscover src src-cov
    exec npm run -s test-coverage
fi
npm