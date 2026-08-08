# React Best Practices - AutoTek

This document outlines React best practices and coding standards for the AutoTek project. Follow these guidelines to ensure code quality, maintainability, performance, and security.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Hooks Best Practices](#hooks-best-practices)
3. [Performance Optimization](#performance-optimization)
4. [State Management](#state-management)
5. [Security Practices](#security-practices)
6. [Code Quality](#code-quality)
7. [Styling Guidelines](#styling-guidelines)
8. [Testing Approach](#testing-approach)

---

## Component Architecture

### Functional Components

✅ **ALWAYS** use functional components with hooks. Class components are legacy and should not be used.

```tsx
// ✅ GOOD
const Button = ({ children, onClick }: ButtonProps) => {
  return <button onClick={onClick}>{children}</button>;
};

// ❌ BAD - Don't use class components
class Button extends React.Component {
  render() {
    return <button>{this.props.children}</button>;
  }
}
```

### Component Structure

**File Organization:**
- One component per file
- Component file name matches component name (PascalCase)
- Export component as default or named export consistently

**Component Structure Order:**
1. Imports (React, third-party, local)
2. Type/Interface definitions
3. Component definition
4. Helper functions (if needed)
5. Export

```tsx
// ✅ GOOD - Proper structure
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import type { User } from '../types';

interface LoginProps {
  onSubmit: (email: string, password: string) => void;
}

export const Login = ({ onSubmit }: LoginProps) => {
  const [email, setEmail] = useState('');
  // ... component logic
};
```

### Component Size

- Keep components focused and single-purpose
- If a component exceeds ~200 lines, consider breaking it into smaller components
- Extract complex logic into custom hooks
- Extract reusable UI patterns into separate components

### Props Interface

✅ **ALWAYS** define TypeScript interfaces for component props.

```tsx
// ✅ GOOD
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'default' | 'large';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button = ({ variant, size, children, onClick, disabled }: ButtonProps) => {
  // ...
};
```

---

## Hooks Best Practices

### Rules of Hooks

✅ **CRITICAL**: Always follow the Rules of Hooks:

1. **Only call hooks at the top level** - Don't call hooks inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Call hooks from React function components or custom hooks

```tsx
// ✅ GOOD
const Component = () => {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  useEffect(() => {
    // side effect
  }, [count]);
  
  return <div>{count}</div>;
};

// ❌ BAD - Conditional hook
const Component = ({ condition }) => {
  if (condition) {
    const [count, setCount] = useState(0); // ❌ Don't do this
  }
};
```

### useState

- Use descriptive names for state variables
- Group related state into objects when appropriate
- Use functional updates when new state depends on previous state

```tsx
// ✅ GOOD
const [user, setUser] = useState<User | null>(null);
const [formData, setFormData] = useState({
  email: '',
  password: '',
});

// Functional update when needed
setCount(prev => prev + 1);
```

### useEffect

- **Only use for side effects** (API calls, subscriptions, DOM manipulation)
- **Always include correct dependencies** - Don't silence lint warnings without understanding
- **Clean up subscriptions** - Return cleanup function when needed

```tsx
// ✅ GOOD
useEffect(() => {
  const subscription = subscribe();
  return () => {
    subscription.unsubscribe(); // Cleanup
  };
}, [dependency]);

// ❌ BAD - Missing dependencies
useEffect(() => {
  fetchData(userId); // ❌ Missing userId in dependencies
}, []); // This will cause stale closures
```

### Custom Hooks

- Extract reusable logic into custom hooks
- Custom hooks should have single responsibility
- Name custom hooks with `use` prefix
- Return values should be consistent and predictable

```tsx
// ✅ GOOD
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  
  const login = async (email: string, password: string) => {
    setLoading(true);
    // ... login logic
  };
  
  return { user, loading, login };
};
```

### Avoid Overusing useEffect

- Don't use `useEffect` to derive state that can be computed during render
- Use `useMemo` for expensive computations
- Use `useCallback` for stable function references

```tsx
// ✅ GOOD - Compute during render
const Component = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return <div>Total: {total}</div>;
};

// ❌ BAD - Unnecessary useEffect
const Component = ({ items }) => {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    setTotal(items.reduce((sum, item) => sum + item.price, 0));
  }, [items]); // ❌ Can be computed during render
};
```

---

## Performance Optimization

### React.memo

Use `React.memo` for components that:
- Receive props that don't change frequently
- Are expensive to render
- Are rendered in lists

**Don't overuse** - Simple components may not benefit from memoization.

```tsx
// ✅ GOOD - Memoize expensive component
const ProductCard = React.memo(({ product, onAddToCart }: ProductCardProps) => {
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
});

// ❌ BAD - Memoizing simple component
const SimpleText = React.memo(({ text }: { text: string }) => {
  return <p>{text}</p>; // Overhead may exceed benefit
});
```

### useMemo

Use `useMemo` for expensive computations that don't need to run on every render.

```tsx
// ✅ GOOD - Expensive computation
const Component = ({ items }) => {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.price - b.price);
  }, [items]);
  
  return <div>{/* render sortedItems */}</div>;
};
```

### useCallback

Use `useCallback` when passing callbacks to memoized child components.

```tsx
// ✅ GOOD
const Parent = ({ items }) => {
  const handleClick = useCallback((id: string) => {
    // handle click
  }, []); // Dependencies
  
  return (
    <div>
      {items.map(item => (
        <MemoizedChild key={item.id} onClick={handleClick} />
      ))}
    </div>
  );
};
```

### Code Splitting

Use `React.lazy()` and `Suspense` for route-based code splitting.

```tsx
// ✅ GOOD
const ProductList = React.lazy(() => import('./pages/ProductList'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductList />
    </Suspense>
  );
}
```

### Image Optimization

- Use modern formats (WebP) when possible
- Implement lazy loading: `loading="lazy"`
- Use appropriate sizes with `srcset`
- Compress images properly

```tsx
// ✅ GOOD
<img
  src={product.image}
  alt={product.name}
  loading="lazy"
  className="w-full h-auto"
/>
```

---

## State Management

### Local State (useState)

Use `useState` for:
- UI-specific state (modals, form inputs, toggles)
- Component-specific data that doesn't need to be shared

```tsx
// ✅ GOOD - Local UI state
const Modal = () => {
  const [isOpen, setIsOpen] = useState(false);
  // ...
};
```

### Redux Toolkit + RTK Query

Use Redux Toolkit for:
- Global application state (authentication, user data)
- Server state management (RTK Query)
- Complex state that needs time-travel debugging

**Current Setup:**
- ✅ Redux Toolkit for global state
- ✅ RTK Query for server state (API calls, caching)
- ✅ Redux Persist for state persistence

**Best Practices:**
- Keep Redux state minimal - only what needs to be global
- Use RTK Query for all API calls
- Use selectors for accessing state
- Keep actions and reducers organized by feature

```tsx
// ✅ GOOD - Using RTK Query
const { data, isLoading } = useGetProductsQuery({ category: 'engine' });

// ✅ GOOD - Using Redux selectors
const user = useAppSelector((state) => state.auth.user);
```

### Context API

Use Context sparingly:
- For theme, language, or other rarely-changing global values
- Avoid for frequently-updating state (causes performance issues)
- Prefer Redux for complex global state

---

## Security Practices

### Input Validation

✅ **ALWAYS** validate user input on the frontend (in addition to backend validation).

```tsx
// ✅ GOOD - Frontend validation
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!email || !isValidEmail(email)) {
    setError('Please enter a valid email');
    return;
  }
  
  if (password.length < 6) {
    setError('Password must be at least 6 characters');
    return;
  }
  
  // Submit to backend
};
```

### XSS Prevention

- ✅ **NEVER** use `dangerouslySetInnerHTML` unless absolutely necessary
- ✅ Always sanitize HTML if using `dangerouslySetInnerHTML`
- ✅ Use React's built-in escaping (default behavior)

```tsx
// ✅ GOOD - React escapes by default
<div>{userInput}</div> // Safe

// ❌ BAD - Dangerous
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // ❌ Only if sanitized
```

### Token Storage

**Current Implementation:**
- Tokens stored in Redux state (persisted to localStorage)
- ⚠️ **Consider**: HttpOnly cookies for production (more secure)

**Best Practices:**
- Never expose tokens in URLs
- Use HTTPS everywhere
- Implement token refresh mechanism
- Clear tokens on logout

### API Security

- ✅ Always use HTTPS for API calls
- ✅ Include authentication tokens in headers (not URLs)
- ✅ Handle errors gracefully (don't expose sensitive info)
- ✅ Implement proper CORS configuration on backend

```tsx
// ✅ GOOD - Secure API call
const response = await fetch('/api/data', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

### Dependency Security

- ✅ Regularly run `npm audit` to check for vulnerabilities
- ✅ Keep dependencies updated
- ✅ Review security advisories for React and dependencies

---

## Code Quality

### TypeScript

✅ **ALWAYS** use TypeScript for:
- Component props interfaces
- Function parameters and return types
- State types
- API response types

```tsx
// ✅ GOOD - Proper TypeScript
interface User {
  id: string;
  email: string;
  name: string;
}

const UserCard = ({ user }: { user: User }) => {
  return <div>{user.name}</div>;
};
```

### Naming Conventions

- **Components**: PascalCase - `ProductCard`, `LoginForm`
- **Functions/Variables**: camelCase - `handleSubmit`, `userData`
- **Constants**: UPPER_SNAKE_CASE - `MAX_FILE_SIZE`, `API_BASE_URL`
- **Custom Hooks**: camelCase with `use` prefix - `useAuth`, `useProducts`

### Error Handling

✅ **ALWAYS** handle errors gracefully:

```tsx
// ✅ GOOD - Error handling
const Component = () => {
  const [error, setError] = useState<string | null>(null);
  
  const handleAction = async () => {
    try {
      await performAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* ... */}
    </div>
  );
};
```

### Error Boundaries

Implement error boundaries for better error handling:

```tsx
// ✅ GOOD - Error boundary
class ErrorBoundary extends React.Component {
  // Implementation
}

// Usage
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### Code Comments

- ✅ Comment **why**, not **what**
- ✅ Use JSDoc for function documentation
- ✅ Remove commented-out code before committing

```tsx
// ✅ GOOD - Explains why
// Using useCallback to prevent unnecessary re-renders of child components
const handleClick = useCallback(() => {
  // ...
}, []);

// ❌ BAD - Explains what (obvious)
// Set the count to 0
setCount(0);
```

---

## Styling Guidelines

### Tailwind CSS

✅ **ALWAYS** use Tailwind CSS utility classes (current approach).

**Best Practices:**
- Use design system components when available
- Extract repeated patterns into components
- Use `cn()` utility for conditional classes
- Follow responsive design patterns

```tsx
// ✅ GOOD - Using Tailwind utilities
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <Button variant="primary">Click me</Button>
</div>

// ✅ GOOD - Using cn() for conditional classes
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className
)}>
```

### Design System

- ✅ Use components from `components/ui/` when available
- ✅ Follow design tokens from `utils/designSystem.ts`
- ✅ Maintain consistency with design system colors and spacing

---

## Testing Approach

### Current Status

⚠️ **Unit tests will be written later** - Not a current priority for MVP.

### Future Testing Strategy

When implementing tests:

1. **Unit Tests** (Jest + React Testing Library)
   - Test component behavior, not implementation
   - Test user interactions
   - Test custom hooks in isolation

2. **Integration Tests**
   - Test complete user flows
   - Test API integration
   - Test routing

3. **Testing Best Practices**
   - Test what users see and do
   - Use `screen` queries from React Testing Library
   - Avoid testing implementation details
   - Write tests that are maintainable

```tsx
// Future example
import { render, screen, fireEvent } from '@testing-library/react';
import { Login } from './Login';

test('user can login with valid credentials', async () => {
  render(<Login />);
  
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'user@example.com' }
  });
  
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});
```

---

## Accessibility

### Semantic HTML

✅ **ALWAYS** use semantic HTML elements:

```tsx
// ✅ GOOD
<button onClick={handleClick}>Submit</button>
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ❌ BAD
<div onClick={handleClick}>Submit</div>
<span>Email</span>
<div role="textbox" />
```

### ARIA Attributes

- Use ARIA labels when needed
- Ensure proper focus management
- Support keyboard navigation
- Test with screen readers

```tsx
// ✅ GOOD - Accessible
<button
  aria-label="Close modal"
  onClick={handleClose}
>
  <X className="h-5 w-5" />
</button>
```

### Focus Management

- Ensure interactive elements are keyboard accessible
- Maintain logical tab order
- Provide visible focus indicators

---

## Code Review Checklist

See `code-review-checklist.md` for a comprehensive checklist to use during code reviews.

---

## Resources

- [React Documentation](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React Testing Library](https://testing-library.com/react)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Last Updated**: January 15, 2025  
**Version**: 1.0
