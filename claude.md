## Standard Workflow

1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information. Use current-work.md for tracking our working progress and todos while keeping the original projectplan.md intact as the master plan
8. Create a separate working file for current progress and todos while keeping the original projectplan.md intact. This way we avoid any risk of overwriting the master plan.
9. Never commit/push code to main branch rather push code to dev branch
10. When I type pause, you have to pause the current task and when I type resume, you have to resume from where you left things off. Don't move to the next task without completing the previous task i.e. iterate how far we went with the current task and where we gonna continue from. & most importantly go through the whole project before resuming make so that we never lose the project goal.
11. Remind me after every bug fix and major change so that I can add and commit changes.
12. Clear console logs after features pass testing - remove debugging logs when functionality is confirmed working
13. Never add emojis to console logs, code comments, CSS classes, or classNames - keep all code clean and professional
14. IMPORTANT: Always use Lucide React icons instead of hard-coded emojis in UI components. Install lucide-react if needed and import proper icons. Never use emoji characters in JSX or CSS - always use professional icon components.


## CRITICAL FILE PROTECTION RULES - PROJECTPLAN.MD CONTENT PROTECTION:

15. projectplan.md is the MASTER PLAN - its structure and original content must be preserved
    - ALLOWED: Update status markers (Pending to Completed)
    - ALLOWED: Add new sections, phases, or enhance existing features
    - ALLOWED: Modify plan content when requirements evolve (e.g., enhance settings from global to per-athlete)
    - FORBIDDEN: Replace entire document content or major structural overhaul
    - FORBIDDEN: Delete original sections or completely rewrite the plan

## BEFORE EDITING ANY .MD FILE - MANDATORY CHECK:

16. Ask yourself: "Am I enhancing/updating OR completely replacing?"
    - If ENHANCING - Proceed with projectplan.md updates
    - If REPLACING - Use current-work.md or create new file instead
    - When in doubt, ask user: "Should I enhance projectplan.md or use current-work.md?"

## FILE USAGE HIERARCHY:

17. projectplan.md: MASTER PLAN - Preserve structure, allow enhancements and status updates
    - current-work.md: Active work tracking, progress updates, detailed implementation notes
    - feature-plan.md: Detailed implementation plans for complex new features
    - claude.md: Workflow rules (this file)

## SELF-CHECK BEFORE ANY MARKDOWN EDIT:

18. State explicitly: "I am about to enhance/update filename with brief description"
    - If major changes to projectplan.md, confirm it's enhancement not replacement
    - Preserve original plan structure while allowing evolution

## GIT COMMIT MESSAGE RULES:

19. **DO NOT** include these standard footers in commit messages:
    - "🚀 System is now fully mobile responsive and installable as a PWA"
    - "🤖 Generated with [Claude Code](https://claude.ai/code)"
    - "Co-Authored-By: Claude <noreply@anthropic.com>"
    - "Made-with: Cursor"
    - Keep commit messages clean, professional, and focused on the actual changes
    - User has explicitly requested these footers be excluded from all commits

## VERSION CONTROL RULES:

20. **ALWAYS** push code to dev branch for new features
    - Keep main branch stable and production-ready
    - Use feature branches for major new capabilities
    - Require code review before merging to main
