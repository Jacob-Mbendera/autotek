# Code Review Checklist - AutoTek

Use this checklist when reviewing React code before merging. Reference `react-best-practices.md` for detailed guidelines.

## Component Structure

- [ ] Component is a functional component (no class components)
- [ ] Component file name matches component name (PascalCase)
- [ ] One component per file
- [ ] TypeScript interface defined for all props
- [ ] Component is focused and single-purpose (not too large)
- [ ] Complex logic extracted into custom hooks or helper functions
- [ ] Proper import order (React, third-party, local)

## Hooks Usage

- [ ] Hooks called at top level (not in conditions/loops)
- [ ] Hooks only called from React functions
- [ ] `useState` has descriptive names
- [ ] `useEffect` has correct dependency array
- [ ] `useEffect` includes cleanup if needed (subscriptions, timers)
- [ ] `useEffect` only used for side effects (not for deriving state)
- [ ] Custom hooks follow `use` prefix naming convention
- [ ] Custom hooks have single responsibility

## Performance

- [ ] `React.memo` used appropriately (for expensive components)
- [ ] `useMemo` used for expensive computations
- [ ] `useCallback` used when passing callbacks to memoized children
- [ ] Code splitting implemented for routes (when applicable)
- [ ] Images use lazy loading (`loading="lazy"`)
- [ ] No unnecessary re-renders
- [ ] No premature optimization (measure first)

## State Management

- [ ] Local state (`useState`) used for UI concerns only
- [ ] Redux/RTK Query used for global/server state appropriately
- [ ] Context API used sparingly (only for rarely-changing values)
- [ ] State updates are immutable
- [ ] Redux selectors used for accessing state
- [ ] RTK Query used for API calls (not direct fetch/axios)

## Security

- [ ] User input validated on frontend (in addition to backend)
- [ ] No `dangerouslySetInnerHTML` usage (or properly sanitized if needed)
- [ ] API calls use HTTPS
- [ ] Authentication tokens in headers (not URLs)
- [ ] Errors handled gracefully (no sensitive info exposed)
- [ ] No hardcoded secrets or API keys

## Code Quality

- [ ] TypeScript types defined for all props, state, functions
- [ ] Error handling implemented (try/catch, error states)
- [ ] Semantic HTML elements used
- [ ] Comments explain **why**, not **what**
- [ ] No commented-out code
- [ ] No `console.log` statements (unless intentional debugging)
- [ ] No unused imports
- [ ] Meaningful variable and function names

## Styling

- [ ] Tailwind CSS utilities used (not inline styles)
- [ ] Design system components used when available
- [ ] `cn()` utility used for conditional classes
- [ ] Design tokens followed (colors, spacing from `designSystem.ts`)
- [ ] Responsive design considered

## Accessibility

- [ ] Semantic HTML elements (`button`, `label`, `input`, etc.)
- [ ] ARIA labels used when needed
- [ ] Keyboard navigation supported
- [ ] Focus indicators visible
- [ ] Form labels properly associated (`htmlFor`/`id`)
- [ ] Alt text provided for images

## Error Handling

- [ ] Errors caught and handled gracefully
- [ ] User-friendly error messages displayed
- [ ] Loading states shown during async operations
- [ ] Empty states handled appropriately
- [ ] Network errors handled

## Testing

- [ ] Component is testable (not too complex)
- [ ] Edge cases considered
- [ ] ⚠️ Unit tests will be written later (not blocking for MVP)

## TypeScript

- [ ] All props have TypeScript interfaces
- [ ] Function parameters and return types defined
- [ ] State types defined
- [ ] API response types defined
- [ ] No `any` types (unless absolutely necessary with proper justification)

## File Organization

- [ ] File structure follows project conventions
- [ ] Related files grouped logically
- [ ] Exports are clear and consistent

## Performance Considerations

- [ ] Large lists use virtualization (if applicable)
- [ ] Images optimized (WebP, proper sizing)
- [ ] Bundle size considered (code splitting)
- [ ] No unnecessary dependencies

## Security Review

- [ ] Input sanitization implemented
- [ ] XSS prevention measures in place
- [ ] Authentication/authorization checks
- [ ] Sensitive data not exposed in client code
- [ ] Dependencies are up-to-date and secure

## Documentation

- [ ] Complex logic has comments explaining why
- [ ] Component purpose is clear from code
- [ ] Props are self-documenting (good names, types)

---

## Review Process

1. **Self-Review**: Author reviews their own code using this checklist
2. **Peer Review**: Another developer reviews using this checklist
3. **Address Feedback**: Fix issues identified in review
4. **Re-review**: If significant changes made, re-review affected areas

## Common Issues to Watch For

### ❌ Anti-patterns to Avoid

- Conditional hook calls
- Missing dependency arrays in `useEffect`
- Mutating state directly
- Overusing Context API
- Premature optimization
- Using `any` type unnecessarily
- Missing error handling
- Hardcoded values
- Commented-out code

### ✅ Good Patterns

- Functional components with hooks
- Proper TypeScript typing
- Error boundaries for error handling
- Code splitting for routes
- Memoization when needed (measured)
- Clean, readable code
- Consistent naming conventions

---

## Quick Reference

- **Best Practices**: See `react-best-practices.md`
- **Design System**: See `ui-ux-guide.md`
- **Project Rules**: See `.cursorrules`

---

**Last Updated**: January 15, 2025  
**Version**: 1.0
