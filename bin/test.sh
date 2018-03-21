#!/usr/bin/env bash
if test "x$ENABLE_COVERAGE" = x; then
    exec npm run -s test-spec
else
    exec npm run -s test-coverage
fi
