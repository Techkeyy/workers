# Workers skill for Claude Code

This folder holds a Claude Code skill that lets you say "port my Playwright tests to Kane" inside Claude Code. The skill runs `workers port` and reads the report.

## Install

Copy the `workers` folder into a Claude Code skills directory.

For all your projects:

```
mkdir -p ~/.claude/skills
cp -r skill/workers ~/.claude/skills/
```

For one project only, run the same copy from the project root into `.claude/skills/`:

```
mkdir -p .claude/skills
cp -r /path/to/workers/skill/workers .claude/skills/
```

On Windows (PowerShell) use `$HOME\.claude\skills` in place of `~/.claude/skills`.

Start a new Claude Code session so the skill is picked up. Then ask, for example, "port my Playwright tests in ./tests to Kane".

The skill needs the Workers CLI (`workers` on your PATH, or `node bin/workers.js` in a Workers checkout), `kane-cli` logged in, and the `claude` or `codex` CLI logged in. See `SKILL.md` for the full prerequisites.
