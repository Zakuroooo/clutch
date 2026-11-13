#!/bin/bash
# PreToolUse hook for Bash: before any command that mentions git add or git commit (with or without
# global options such as -C or -c), scan the whole working tree for env files and secrets.
# Exit 2 blocks the command and shows stderr to Claude.
# This is a second line of defence. The real gate is the git pre-commit hook in .githooks/.
set -u
CMD=$(jq -r '.tool_input.command // empty')
echo "$CMD" | grep -qE '(^|[^A-Za-z0-9_-])git([[:space:]]+(-[A-Za-z-]+(=[^[:space:]]+)?|-[Cc][[:space:]]+[^[:space:]]+))*[[:space:]]+(add|commit|stash|push)([[:space:]]|$)' || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if echo "$CMD" | grep -E '(^|[[:space:]/])\.env(\.[A-Za-z0-9_.-]+)?([[:space:]]|$)' | grep -qv '\.env\.example'; then
  echo "Blocked: do not add .env files. Keys stay in .env.local, which is git-ignored." >&2
  exit 2
fi
if echo "$CMD" | grep -qE -- '--no-verify|[[:space:]]-n([[:space:]]|$)|core\.hooksPath'; then
  echo "Blocked: do not skip or redirect the pre-commit hook." >&2
  exit 2
fi
if ! "${CLAUDE_PROJECT_DIR:-.}"/.claude/hooks/scan-secrets.sh; then
  echo "Blocked by the secret scan." >&2
  exit 2
fi
exit 0
