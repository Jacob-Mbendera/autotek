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

## TESTING & QUALITY ASSURANCE:

21. Before committing code:
    - Test the feature manually
    - Check for console errors
    - Test responsive at mobile (360px), tablet (768px), desktop (1024px, 1440px)
    - Test all themes/modes where applicable
    - Verify keyboard navigation and visible focus rings
    - Test edge cases: empty states, loading, errors, offline

22. **Verification: prove it, do not assume it**
    - Verify against the running app. Not the diff, not a passing typecheck — a build that compiles proves nothing about behaviour.

23. **When to use which:**
    - Backend (API routes, server actions, models, queries, auth, env, caching) — verify with curl, always. Check status codes, redirects, headers, JSON, rendered markup.
    - Frontend (components, styling, state, forms, layout) — verify with browser tooling, always.
    - Both — when a backend change affects what the user sees. A backend change that alters a response shape, a redirect, or auth is a frontend change too.
    - Use browser automation tools where available; otherwise drive headless Chrome with Puppeteer. Either is acceptable; skipping is not.
    - Judgement applies to scope, never to whether to verify. A copy tweak does not need a browser pass; anything touching data, money, auth or caching does.

24. **After every major change:**
    - Every affected route returns the status it should, including the failure paths
    - The change is visible in the running app, not merely present in the code
    - Data actually persists — read it back from the database, do not trust the redirect
    - No new console or page errors
    - Interactions work by keyboard, and focus lands and returns correctly

25. **Check for stale state — non-negotiable.**
    - A change is not verified until the value a user sees has changed. The database being correct proves nothing. "It updated a moment later" is a failure, not a pass.
    - If a read shows an old value, that is the finding. Investigate it. Never explain it away.
    - Four separate caches sit between a write and a user's eyes:
      - Server render / ISR — prerendered page replays until revalidated. Test by curling the page immediately after the write.
      - Framework router cache — visited payloads replay on client-side navigation. Test by navigating away and back by clicking, not reloading.
      - Service worker — StaleWhileRevalidate serves the old copy, refreshes behind. Test by reloading twice; if only the second is right, it is stale.
      - Browser / CDN — Cache-Control and stale-while-revalidate headers. Test by inspecting response headers.
    - Mandatory checks after anything touching displayed data:
      - A second, separate browser context — not the one that made the change
      - The first load after the change, not the second
      - Client-side navigation (clicking a link), not only a hard reload
      - With the service worker registered and controlling, against a production build
      - Response headers, for anything that will sit behind a CDN

26. **Check backend and frontend still agree.**
    - A change on one side that the other has not followed compiles cleanly and fails in the browser:
      - Field names, types and shapes match what the UI reads
      - Units match end to end (e.g., cents vs dollars, timestamps vs formatted dates)
      - Enum and status values are the same on both sides
      - Validation agrees — what the server rejects, the client should catch first
      - Server-only modules are not imported into client code

27. **Report what was verified, and how.**
    - Name the actual checks and their results. "Typecheck passes" is not verification. Concrete beats general:
      - "Created an item: it appears in the list, and deleting removes it."
      - "Changed price to $199.99 in DB; page rendered $199.99."
      - "Unauthenticated /admin returned 307 to /login?next=…."
      - "All routes clean at 360/768/1024/1440 — no overflow, no console errors."
    - Say plainly what was not verified, and why.
