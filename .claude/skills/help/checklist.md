# Help / Status Check Checklist

## Step 1: Read Current Project State
- [ ] Read `docs/PRD.md` — is the project initialized or still a template?
- [ ] Read `features/INDEX.md` — what features exist and what are their statuses?
- [ ] Scan codebase: `ls src/components/*.tsx 2>/dev/null` — what has been built?
- [ ] Scan APIs: `ls src/app/api/ 2>/dev/null` — what API routes exist?

## Step 2: Identify Where the User Is
- [ ] Determined the last completed workflow step (requirements / architecture / frontend / backend / qa / deploy)
- [ ] Identified the current blocking feature (the one not yet done)
- [ ] Identified if any feature is stuck mid-workflow (In Progress / In Review)

## Step 3: Answer User's Question (if any)
- [ ] If user asked about available skills → listed all 6 with one-line descriptions
- [ ] If user asked about project structure → explained directory layout
- [ ] If user asked how to add a feature → pointed to `/requirements`
- [ ] If user asked how to deploy → explained `/deploy` prerequisites
- [ ] If user asked something else → answered in context of current project state

## Step 4: Output
- [ ] Provided "Current Project Status" summary
- [ ] Provided "Features Overview" table (from INDEX.md)
- [ ] Provided single "Recommended Next Step" with exact command
- [ ] Provided "Other Available Actions" as secondary options
- [ ] Response is concise and actionable (no long explanations unless asked)
