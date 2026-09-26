---
name: write-specs
description: Write Specs command: Generate PRD and SDD from discussion/refinement content
---

# Write Specs

Take the details captured during a discussion/refinement conversation about a product
or feature idea and turn them into a Product Requirements Document (PRD) and a System
Design/Architecture Document (SDD), using the templates bundled with this Claude Code
skill.

## When to run this

Run this command after a discussion/refinement conversation has produced enough detail
about a product or feature (problem, users, goals, scope, technical direction, etc.),
or whenever the user asks to "write specs", "generate the PRD and SDD", or "document
what we just discussed".

## Required input

- **The discussion/refinement content** — the problem, users, goals, scope, and any
  technical decisions already talked through with the user, either from the current
  conversation or from a note/file the user points you to. If this hasn't happened yet
  or the details are too thin to fill out the templates, stop and ask the user to
  clarify or continue the discussion before drafting documents — do not invent product
  or architecture decisions that weren't actually discussed.
- **Product/feature name** — used to name the output files. Ask if it isn't obvious
  from context.

## Templates

- **PRD:** [prd-template.md](templates/prd-template.md)
- **SDD:** [architecture-template.md](templates/architecture-template.md)

## Steps

1. **Confirm you have enough material.** Re-read the discussion/refinement content and
   check it covers, at minimum: problem statement, target users, goals/non-goals,
   scope, and (for the SDD) the intended technical approach. If a template section has
   no corresponding discussion content, ask the user rather than guessing.
2. **Draft the PRD** by copying
   `.claude/skills/write-specs/templates/prd-template.md` and filling in every
   section from the discussion content. Leave a section's placeholder blank and flag it
   to the user only if it genuinely wasn't discussed — don't delete sections from the
   template.
3. **Draft the SDD** by copying
   `.claude/skills/write-specs/templates/architecture-template.md` and filling
   it in from the discussion content, using the drafted PRD as the source of truth for
   product requirements. Complete the PRD Traceability table (section 18) so every
   PRD requirement maps to a technical component.
4. **Name and save the files** under `docs/`, following the existing naming
   convention in this repo (e.g. `TutorBridge_PRD_v1.0.md`,
   `TutorBridge_SDD_v1.0.md`): `<ProductName>_PRD_v<version>.md` and
   `<ProductName>_SDD_v<version>.md`. If a PRD/SDD for this product already exists,
   ask whether to update it in place or create a new incremented version rather than
   silently overwriting an approved document.
5. **Summarize what was written** back to the user, including any template sections
   left incomplete for lack of discussed detail, so they know what still needs
   clarification or approval.

## Notes

- This command only produces draft documents — it does not ratify or approve them.
  Approval remains a separate step (see the PRD's Stakeholder Decisions section and
  the SDD's Implementation Handoff section).
- Never fabricate requirements, users, metrics, or architecture decisions to fill a
  template section — leave it open and ask instead.
