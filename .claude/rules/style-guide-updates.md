# Updating Coding Conventions

## When a Convention Changes

When adding or modifying a coding convention, update **both** locations:

1. **`.claude/rules/<rule>.md`** — AI-readable rules (compact, examples-focused)
2. **`.claude/backend.md`** — Human-readable documentation (if the change affects project structure or tech stack)

## Process

### Adding a New Rule

1. Create a new file in `.claude/rules/` with the rule name (kebab-case)
2. Add a row to the rules table in `.claude/CLAUDE.md`
3. If the rule affects project structure, update `.claude/backend.md`

### Modifying an Existing Rule

1. Update the rule file in `.claude/rules/`
2. Search the codebase for violations of the updated rule
3. Fix existing violations or document them as exceptions

### Removing a Rule

1. Delete the rule file from `.claude/rules/`
2. Remove the row from the rules table in `.claude/CLAUDE.md`

## Rule File Format

Every rule file should follow this structure:

```markdown
# Rule Name

## Core Principle (1-2 sentences)

## Rules (bulleted list or table)

## Examples (CORRECT / WRONG pairs)

## Exceptions (if any)
```

Keep rule files **compact** — rules and examples only. Save detailed explanations and rationale for human-readable docs.
