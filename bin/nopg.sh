#!/usr/bin/env bash
if uname -s|grep -iq Darwin; then
    self="$0"
else
    self="$(readlink -e "$0")"
fi
self_dir="$(dirname "$self")"
node="$(command -v node || command -v nodejs)"

if test "x$node" = x; then
    echo "ERROR: Could not find node or nodejs command" >&2
    exit 1
fi

exec "$node" "$self_dir/../dist/bin/$(basename "$self" ".sh").js" "$@"
