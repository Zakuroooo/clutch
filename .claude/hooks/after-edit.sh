#!/bin/bash
# PostToolUse hook for Edit|Write: format the edited file, then type-check TypeScript.
# Reads the hook JSON from stdin. Exit 2 sends stderr back to Claude; exit 0 is silent.
set -u
FILE=$(jq -r '.tool_input.file_path // empty')
[ -z "$FILE" ] && exit 0
[ -f "$FILE" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

case "$FILE" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.json|*.css|*.md|*.yml|*.yaml)
    if [ -x node_modules/.bin/prettier ]; then
      node_modules/.bin/prettier --write --log-level=warn "$FILE" >/dev/null 2>&1 || true
    fi
    ;;
  *.py)
    if command -v ruff >/dev/null 2>&1; then ruff format -q "$FILE" >/dev/null 2>&1 || true; fi
    ;;
esac

case "$FILE" in
  *.ts|*.tsx)
    if [ -x node_modules/.bin/tsc ] && [ -f tsconfig.json ]; then
      OUT=$(node_modules/.bin/tsc --noEmit --incremental --pretty false 2>&1 | head -20)
      if [ -n "$OUT" ]; then
        echo "Type errors after editing $FILE:" >&2
        echo "$OUT" >&2
        exit 2
      fi
    fi
    ;;
esac
exit 0
