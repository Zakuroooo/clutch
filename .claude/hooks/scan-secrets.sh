#!/bin/bash
# Shared secret scan. Used by the Claude Code hook (guard-commit.sh) and the git pre-commit hook.
# Scans everything that could end up in a commit: staged and unstaged changes to tracked files,
# and untracked files that are not git-ignored. Exit 1 if anything looks like a secret or an env file.
set -u
PATTERN='(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|gsk_[A-Za-z0-9]{20,}|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)'
BAD=0

ENVFILES=$( { git diff --cached --name-only; git ls-files --others --exclude-standard; } 2>/dev/null \
  | grep -E '(^|/)\.env(\..+)?$' | grep -v '\.env\.example$' || true)
if [ -n "$ENVFILES" ]; then
  echo "An env file is staged or not git-ignored: $ENVFILES" >&2
  BAD=1
fi

if git rev-parse --verify -q HEAD >/dev/null; then BASE=HEAD; else BASE=$(git hash-object -t tree /dev/null); fi
# The index is what a commit actually records, so it is scanned on its own, as well as the working tree.
STAGED_HITS=$(git diff --cached --no-color --no-ext-diff --no-textconv "$BASE" 2>/dev/null | grep -E '^\+' | grep -cE "$PATTERN" || true)
TREE_HITS=$(git diff --no-color --no-ext-diff --no-textconv "$BASE" 2>/dev/null | grep -E '^\+' | grep -cE "$PATTERN" || true)
HITS=$(( ${STAGED_HITS:-0} + ${TREE_HITS:-0} ))
UNTRACKED=$(git ls-files --others --exclude-standard -z 2>/dev/null | xargs -0 grep -lE "$PATTERN" 2>/dev/null || true)
if [ "${HITS:-0}" != "0" ] || [ -n "$UNTRACKED" ]; then
  echo "Something in the working tree looks like a secret. Remove it, and rotate the key if it is real." >&2
  [ -n "$UNTRACKED" ] && echo "Untracked files: $UNTRACKED" >&2
  BAD=1
fi
exit $BAD
