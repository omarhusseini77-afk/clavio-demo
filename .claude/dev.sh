#!/bin/sh
# Node lives in ~/.local/node, which is on PATH via .zshrc but not in the
# non-login shell the preview server launches with.
export PATH="$HOME/.local/node/bin:$PATH"
cd /Users/omarhusseini/dev/clavio-demo
exec npm run dev
