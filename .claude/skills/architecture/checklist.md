# Architecture Design Checklist

## Before Starting
- [ ] Read `features/INDEX.md` for project context
- [ ] Read the full feature spec (`features/PROJ-X-*.md`)
- [ ] Checked existing components: `git ls-files src/components/`
- [ ] Checked existing APIs: `git ls-files src/app/api/`
- [ ] No existing component or API duplicated in this design

## Design: Component Structure
- [ ] Visual component tree created (ASCII, PM-readable)
- [ ] Every UI area of the feature represented in the tree
- [ ] New components identified vs. existing components reused

## Design: Data Model
- [ ] Described in plain English (no SQL, no code)
- [ ] Clarified storage: localStorage vs. Supabase database
- [ ] If database: tables and relationships described in plain language
- [ ] If database: multi-tenant requirement noted (user_id on all tables)

## Design: Tech Decisions
- [ ] Backend need explicitly stated (yes/no with reason)
- [ ] Each tech decision justified in one plain-language sentence
- [ ] External packages listed (name + purpose only, no code)

## Clarifying Questions
- [ ] Asked user about login/accounts if unclear
- [ ] Asked user about cross-device sync if unclear
- [ ] Asked user about multi-user/roles if unclear
- [ ] Asked user about third-party integrations if unclear

## Completion
- [ ] Design added to feature spec under "Tech Design (Solution Architect)" section
- [ ] User has reviewed and approved the design
- [ ] `features/INDEX.md` status updated to "Architected"
- [ ] Git commit created: `docs(PROJ-X): Add technical design for [feature name]`
- [ ] Told user: "Next step: Run `/frontend` to build the UI for this feature."
