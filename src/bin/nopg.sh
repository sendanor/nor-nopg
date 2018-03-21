#!/bin/sh

node="$(command -v node || command -v nodejs)"

if test "x$node" = x; then
    echo "ERROR: Could not find node or nodejs command" >&2
    exit 1
fi

exec "$node" "$(basename "$0" ".sh").js" "$@"
