# Agent guide

Conventions for AI/agents working in this repo.

## Dev log (`log.md`)

`log.md` is a running record of changes, decisions, and gotchas — newest entries
first, append-only (never edit or delete existing entries).

**The log tracks changes made by AI/agents.** When you (an agent) finish a piece
of work, add a new entry.

**The human (Tim) does not update the log for his own edits.** So the log is not
a complete history of the repo. If the log and the actual code disagree, the code
is right — Tim made a change by hand.

**Before relying on the log for context, cross-check `git history`.** If recent
commits aren't reflected in the log, that's expected: those are Tim's own edits.
Use `git log`, `git show`, and `git diff` to see what actually changed rather than
assuming the log is exhaustive.

## Commits

Tim does his own git commits — don't commit on his behalf unless asked.
