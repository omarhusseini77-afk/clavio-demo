#!/bin/sh
# Node lives in ~/.local/node on this machine and is not on the launcher's
# inherited PATH, so put it there before handing off to npm.
export PATH="$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")/.." || exit 1
exec npm run dev "$@"
