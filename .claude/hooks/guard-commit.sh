#!/bin/bash
# PreToolUse hook for Bash: block git add/commit that would include .env files or secrets.
# Exit 2 blocks the command and shows stderr to Claude.
set -u
CMD=$(jq -r '.tool_input.command // empty')
echo "$CMD" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+(add|commit)' || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# 1. Adding an env file by name (anything but .env.example).
if echo "$CMD" | grep -qE 'git[[:space:]]+add' && echo "$CMD" | grep -E '(^|[[:space:]/])\.env(\.[A-Za-z0-9_.-]+)?([[:space:]]|$)' | grep -qv '\.env\.example'; then
  echo "Blocked: do not add .env files. Keys stay in .env.local, which is git-ignored." >&2
  exit 2
fi

# 2. Env files already staged.
STAGED=$(git diff --cached --name-only 2>/dev/null | grep -E '(^|/)\.env(\..+)?$' | grep -v '\.env\.example$' || true)
if [ -n "$STAGED" ]; then
  echo "Blocked: an env file is staged: $STAGED. Run: git restore --staged <file>" >&2
  exit 2
fi

# 3. Secret-looking strings in what is staged (or in everything, for 'git add -A' / 'git add .').
PATTERN='(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|gsk_[A-Za-z0-9]{20,}|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
if echo "$CMD" | grep -qE 'git[[:space:]]+add[[:space:]]+(-A|--all|\.)'; then
  HITS=$(git diff --no-color 2>/dev/null | grep -E '^\+' | grep -E "$PATTERN" | cut -c1-60 || true)
  UNTRACKED=$(git ls-files --others --exclude-standard -z 2>/dev/null | xargs -0 grep -lE "$PATTERN" 2>/dev/null || true)
else
  HITS=$(git diff --cached --no-color 2>/dev/null | grep -E '^\+' | grep -E "$PATTERN" | cut -c1-60 || true)
  UNTRACKED=""
fi
if [ -n "$HITS$UNTRACKED" ]; then
  echo "Blocked: this looks like a secret in the change. Remove it, and rotate the key if it is real." >&2
  [ -n "$UNTRACKED" ] && echo "Files: $UNTRACKED" >&2
  exit 2
fi
exit 0
