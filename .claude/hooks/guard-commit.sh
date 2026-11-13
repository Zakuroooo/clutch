#!/bin/bash
# PreToolUse hook for Bash. A safety net against ACCIDENTAL commits of keys or env files.
#
# What it is not: a sandbox. An agent that can run shell commands could get round any check
# on command text (quoting, cd, aliases), so this hook does not try to out-parse the shell.
# Instead, for every command that mentions git, it checks the real state:
#   1. the repository's pre-commit hook is still switched on (core.hooksPath = .githooks), and
#   2. nothing in the index or working tree looks like a secret or an env file.
# The git pre-commit hook in .githooks/ is the gate that sees the final index.
# Exit 2 blocks the command and shows stderr to Claude.
set -u
CMD=$(jq -r '.tool_input.command // empty')
echo "$CMD" | grep -qE '(^|[^A-Za-z0-9_])git([^A-Za-z0-9_]|$)' || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Obvious attempts to skip or redirect the hook, or to commit somewhere else. Best effort only.
if echo "$CMD" | grep -qiE -- '--no-v[a-z]*|hookspath|include(if)?\.|alias\.|--config-env|GIT_CONFIG|GIT_DIR|GIT_WORK_TREE|GIT_INDEX_FILE'; then
  echo "Blocked: this command changes how git hooks or config are resolved. Ask Pranay to run it himself if it is needed." >&2
  exit 2
fi
if echo "$CMD" | grep -qE '(add|commit)' && echo "$CMD" | grep -qE -- '(^|[[:space:]])(-C|--git-dir|--work-tree)([[:space:]=]|$)|(^|[;&|(][[:space:]]*)(cd|pushd)[[:space:]]|(^|[[:space:]])-[A-Za-z]*n[A-Za-z]*([[:space:]]|$)'; then
  echo "Blocked: run git add and git commit from the project root, as plain commands, without -n." >&2
  exit 2
fi
if echo "$CMD" | grep -E '(^|[[:space:]/])\.env(\.[A-Za-z0-9_.-]+)?([[:space:]]|$)' | grep -qv '\.env\.example'; then
  echo "Blocked: do not pass .env files to git. Keys stay in .env.local, which is git-ignored." >&2
  exit 2
fi

# State checks: these hold however the command is written.
if [ "$(git config --get core.hooksPath 2>/dev/null)" != ".githooks" ]; then
  echo "Blocked: the pre-commit hook is not switched on. Run: git config core.hooksPath .githooks" >&2
  exit 2
fi
if ! ./.claude/hooks/scan-secrets.sh; then
  echo "Blocked by the secret scan." >&2
  exit 2
fi
exit 0
