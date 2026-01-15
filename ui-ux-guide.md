# UI/UX Design Guide - AutoTek

## Design System Overview

This document defines the design system, UI components, UX patterns, and styling guidelines for the AutoTek platform. All UI development should follow these guidelines to ensure consistency and maintainability.

## Design Principles

1. **Simplicity**: Clean, uncluttered interfaces that focus on essential information
2. **Accessibility**: WCAG 2.1 AA compliance for inclusive design
3. **Responsiveness**: Mobile-first approach, optimized for all screen sizes
4. **Consistency**: Unified design language across all pages and components
5. **Performance**: Fast loading times and smooth interactions

## Color Palette

### Primary Colors
- **Primary Teal**: `#14B8A6` (teal-500)
  - Used for: Primary buttons, links, active states, brand elements
  - Variants:
    - Light: `#5EEAD4` (teal-300)
    - Dark: `#0D9488` (teal-600)
    - Darker: `#0F766E` (teal-700)

### Secondary Colors
- **Secondary Blue**: `#3B82F6` (blue-500)
  - Used for: Secondary actions, informational elements
- **Accent Orange**: `#F97316` (orange-500)
  - Used for: Warnings, highlights, special offers

### Neutral Colors
- **Gray Scale**:
  - `#F9FAFB` (gray-50) - Backgrounds
  - `#F3F4F6` (gray-100) - Light backgrounds
  - `#E5E7EB` (gray-200) - Borders, dividers
  - `#9CA3AF` (gray-400) - Placeholder text
  - `#6B7280` (gray-500) - Secondary text
  - `#374151` (gray-700) - Primary text
  - `#111827` (gray-900) - Headings, dark text

### Semantic Colors
- **Success/Completed**: `#10B981` (green-500)
  - Used for: Success messages, completed states
- **Error**: `#EF4444` (red-500)
  - Used for: Error messages, destructive actions
- **Warning/Pending**: `#F59E0B` (amber-500)
  - Used for: Warning messages, caution states, pending status
- **Info/Processing**: `#3B82F6` (blue-500)
  - Used for: Informational messages, processing status

### Status Colors
- **Pending**: `#F59E0B` (Orange/Yellow)
  - Used for: Pending orders, pending service requests
- **Processing**: `#3B82F6` (Blue)
  - Used for: Orders/services being processed
- **In Progress**: `#8B5CF6` (Purple)
  - Used for: Orders/services currently in progress
- **Completed**: `#10B981` (Green)
  - Used for: Completed orders, delivered items, successful actions
- **Error**: `#EF4444` (Red)
  - Used for: Cancelled orders, failed actions, error states

### Usage Guidelines
- Use primary teal for main CTAs and brand elements
- Use neutral grays for text hierarchy
- Use semantic colors sparingly for feedback
- Maintain sufficient contrast ratios (minimum 4.5:1 for text)

## Typography

### Font Family
- **Primary Font**: Inter (Google Fonts)
  - Weights: 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)
  - Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Font Sizes
- **H1 (Page Title)**: `2.25rem` (36px) - `text-4xl`
  - Weight: 700 (Bold)
  - Line height: 1.2
- **H2 (Section Title)**: `1.875rem` (30px) - `text-3xl`
  - Weight: 600 (Semi-bold)
  - Line height: 1.3
- **H3 (Subsection Title)**: `1.5rem` (24px) - `text-2xl`
  - Weight: 600 (Semi-bold)
  - Line height: 1.4
- **H4 (Card Title)**: `1.25rem` (20px) - `text-xl`
  - Weight: 600 (Semi-bold)
  - Line height: 1.5
- **Body (Regular Text)**: `1rem` (16px) - `text-base`
  - Weight: 400 (Regular)
  - Line height: 1.6
- **Body Small**: `0.875rem` (14px) - `text-sm`
  - Weight: 400 (Regular)
  - Line height: 1.5
- **Caption**: `0.75rem` (12px) - `text-xs`
  - Weight: 400 (Regular)
  - Line height: 1.4

### Typography Classes (Tailwind)
```tsx
// Headings
<h1 className="text-4xl font-bold text-gray-900">Page Title</h1>
<h2 className="text-3xl font-semibold text-gray-900">Section Title</h2>
<h3 className="text-2xl font-semibold text-gray-800">Subsection</h3>
<h4 className="text-xl font-semibold text-gray-800">Card Title</h4>

// Body text
<p className="text-base text-gray-700">Regular paragraph text</p>
<p className="text-sm text-gray-600">Small text</p>
<span className="text-xs text-gray-500">Caption text</span>
```

## Spacing & Layout

### Spacing Scale
Using Tailwind's default spacing scale (4px base unit):
- `0` - 0px
- `1` - 4px (0.25rem)
- `2` - 8px (0.5rem)
- `3` - 12px (0.75rem)
- `4` - 16px (1rem)
- `5` - 20px (1.25rem)
- `6` - 24px (1.5rem)
- `8` - 32px (2rem)
- `10` - 40px (2.5rem)
- `12` - 48px (3rem)
- `16` - 64px (4rem)
- `20` - 80px (5rem)

### Layout Guidelines
- **Container Max Width**: `1280px` (7xl)
- **Content Padding**: `16px` (mobile), `24px` (tablet), `32px` (desktop)
- **Section Spacing**: `48px` (mobile), `64px` (desktop)
- **Card Padding**: `16px` (mobile), `24px` (desktop)
- **Button Padding**: `12px 24px` (default), `8px 16px` (small)

### Grid System
- Use CSS Grid or Flexbox for layouts
- 12-column grid for complex layouts
- Responsive breakpoints (see below)

## Component Guidelines

### Buttons

#### Primary Button
```tsx
<button className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-6 py-3 rounded-lg transition-colors">
  Primary Action
</button>
```

#### Secondary Button
```tsx
<button className="bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 font-medium px-6 py-3 rounded-lg transition-colors">
  Secondary Action
</button>
```

#### Ghost Button
```tsx
<button className="text-teal-600 hover:bg-teal-50 font-medium px-6 py-3 rounded-lg transition-colors">
  Ghost Action
</button>
```

#### Button Sizes
- **Large**: `px-8 py-4 text-lg`
- **Default**: `px-6 py-3 text-base`
- **Small**: `px-4 py-2 text-sm`

### Input Fields

#### Text Input
```tsx
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
  placeholder="Enter text"
/>
```

#### Phone Input (Malawi Format)
```tsx
<div className="flex">
  <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700">
    +265
  </span>
  <input
    type="tel"
    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
    placeholder="XXXXXXXXX"
  />
</div>
```

### Cards

#### Default Card
```tsx
<div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
  {/* Card content */}
</div>
```

#### Card Variants
- **SM**: `p-4 rounded-lg shadow-sm`
- **MD**: `p-6 rounded-xl shadow-md` (default)
- **LG**: `p-8 rounded-2xl shadow-lg`
- **XL**: `p-10 rounded-2xl shadow-xl`

### Modals

#### Modal Structure
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
    {/* Modal content */}
  </div>
</div>
```

### Forms

#### Form Layout
- Label above input (not inline)
- Error messages below input in red
- Required fields marked with asterisk (*)
- Submit button at bottom, full width on mobile

### Navigation

#### Header Navigation
- Sticky header on scroll
- Logo on left, navigation items center/right
- Mobile: Hamburger menu
- Active state: Teal underline or background

## UI Patterns

### Product Cards
- Image (16:9 aspect ratio)
- Product name (H4)
- Price (bold, teal)
- "Add to Cart" button
- Hover: Slight elevation increase

### Order Status
- Use badges with status colors:
  - **Pending**: `#F59E0B` (Orange/Yellow)
  - **Processing**: `#3B82F6` (Blue)
  - **In Progress**: `#8B5CF6` (Purple)
  - **Completed/Delivered**: `#10B981` (Green)
  - **Cancelled/Error**: `#EF4444` (Red)

### Loading States
- Skeleton loaders for content
- Spinner for buttons/actions
- Progress bars for multi-step processes

### Empty States
- Illustrative icon (lucide-react)
- Clear message
- Action button to resolve empty state

### Error States
- Clear error message
- Suggested action
- Retry button if applicable

## Responsive Breakpoints

Using Tailwind's default breakpoints:

- **Mobile**: `< 640px` (default, mobile-first)
- **Tablet**: `≥ 640px` (sm:)
- **Desktop**: `≥ 1024px` (lg:)
- **Large Desktop**: `≥ 1280px` (xl:)
- **Extra Large**: `≥ 1536px` (2xl:)

### Mobile-First Approach
```tsx
// Mobile-first: base styles for mobile, then add larger breakpoints
<div className="p-4 lg:p-8">
  <h1 className="text-2xl lg:text-4xl">Title</h1>
</div>
```

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

1. **Color Contrast**
   - Text: Minimum 4.5:1 contrast ratio
   - Large text: Minimum 3:1 contrast ratio
   - Interactive elements: Minimum 3:1 contrast ratio

2. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Visible focus indicators (ring-2 ring-teal-500)
   - Logical tab order

3. **Screen Readers**
   - Semantic HTML elements
   - ARIA labels where needed
   - Alt text for images
   - Form labels properly associated

4. **Touch Targets**
   - Minimum 44x44px for touch targets
   - Adequate spacing between interactive elements

### Accessibility Classes
```tsx
// Focus visible
className="focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"

// Screen reader only
className="sr-only"

// Skip to content link
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0">
  Skip to content
</a>
```

## Icon Usage

### Library: lucide-react

**CRITICAL**: Do NOT use emojis in code. Always use lucide-react icons.

### Icon Sizes
- **Small**: `h-4 w-4` (16px)
- **Default**: `h-5 w-5` (20px)
- **Medium**: `h-6 w-6` (24px)
- **Large**: `h-8 w-8` (32px)
- **Extra Large**: `h-12 w-12` (48px)

### Icon Usage Examples
```tsx
import { ShoppingCart, User, Heart, Search, Menu } from 'lucide-react';

// Inline icon
<button>
  <ShoppingCart className="h-5 w-5 text-teal-600" />
  Add to Cart
</button>

// Icon only button
<button className="p-2 hover:bg-gray-100 rounded-lg">
  <Search className="h-6 w-6 text-gray-600" />
</button>

// Icon with text
<div className="flex items-center gap-2">
  <User className="h-5 w-5 text-gray-400" />
  <span>Profile</span>
</div>
```

### Common Icons
- **Shopping**: `ShoppingCart`, `Package`, `ShoppingBag`
- **User**: `User`, `UserCircle`, `LogIn`, `LogOut`
- **Navigation**: `Menu`, `X`, `ChevronRight`, `ChevronLeft`, `ArrowLeft`
- **Actions**: `Plus`, `Minus`, `Edit`, `Trash`, `Check`, `X`
- **Status**: `CheckCircle`, `XCircle`, `AlertCircle`, `Info`
- **Payment**: `CreditCard`, `Wallet`, `Banknote`
- **Services**: `Wrench`, `Car`, `Truck`

## Animation & Transitions

### Transition Guidelines
- **Duration**: 150ms (fast), 200ms (default), 300ms (slow)
- **Easing**: `ease-in-out` for most transitions
- **Properties**: Transform and opacity for performance

### Common Transitions
```tsx
// Hover transition
className="transition-colors duration-200"

// Transform transition
className="transition-transform duration-200 hover:scale-105"

// All properties
className="transition-all duration-200"
```

### Animation Examples
- **Button hover**: Color change (150ms)
- **Card hover**: Elevation increase, slight scale (200ms)
- **Modal open**: Fade in + scale (300ms)
- **Loading spinner**: Rotate animation
- **Toast notification**: Slide in from top (300ms)

## Tailwind Configuration

### Custom Colors
Add to `tailwind.config.js`:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Primary teal
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
    },
  },
}
```

### Custom Fonts
```javascript
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

## Best Practices

1. **Consistency**: Use predefined components and styles
2. **Performance**: Minimize custom CSS, use Tailwind utilities
3. **Maintainability**: Create reusable components
4. **Accessibility**: Always consider a11y requirements
5. **Responsive**: Test on multiple screen sizes
6. **Icons**: Always use lucide-react, never emojis in code
7. **Colors**: Use semantic color names, not arbitrary values
8. **Spacing**: Use Tailwind spacing scale, avoid arbitrary values

## Component Checklist

When creating a new component:
- [ ] Follows color palette
- [ ] Uses Inter font family
- [ ] Responsive (mobile-first)
- [ ] Accessible (keyboard, screen reader)
- [ ] Uses lucide-react icons (no emojis)
- [ ] Proper hover/focus states
- [ ] Loading/error states considered
- [ ] Consistent spacing
- [ ] Smooth transitions

---

**Last Updated**: [Date]  
**Version**: 1.0
