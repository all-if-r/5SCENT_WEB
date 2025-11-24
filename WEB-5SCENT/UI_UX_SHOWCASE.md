# UI/UX Feature Showcase

## 1. Empty Cart State

**Visual Layout**:
```
┌─────────────────────────────────────┐
│          SHOPPING CART              │
│         ____________                │
│                                     │
│                                     │
│             🛍️ (large)             │
│                                     │
│      Your cart is empty             │
│  Add some fragrances to get        │
│          started                    │
│                                     │
│         [Continue Shopping]         │
│                                     │
└─────────────────────────────────────┘
```

**Components**:
- ShoppingBagIcon: `w-24 h-24 text-gray-300`
- Heading: `text-3xl font-bold text-gray-900`
- Subheading: `text-gray-500 text-lg`
- Button: `px-8 py-3 bg-black text-white rounded-full`

**CSS Classes**: 
- Container: `flex flex-col items-center justify-center py-24 px-4`
- Spacing: Uses gap and margin utilities for clean layout

---

## 2. Filled Cart - Controls Section

**Visual Layout**:
```
┌─────────────────────────────────────────┐
│ ☑️ Select all (3 items)  [Delete All 3] │
├─────────────────────────────────────────┤
```

**Elements**:
- Checkbox: `w-5 h-5 cursor-pointer`
- Text: `text-sm text-gray-600`
- Delete Button: `px-6 py-2 border-2 border-black text-black rounded-full`

**Behavior**:
- Checkbox toggles all items
- Delete button only shows when items selected
- Shows dynamic count: "Delete All (X)"
- Button has hover effect: hover:bg-black hover:text-white

---

## 3. Cart Item Layout

**Visual Layout**:
```
┌──────────────────────────────────────────────────┐
│ ☑️ [product]  Product Name              $XX.XX   │
│      image    Size: 30ml    [−] 1 [+]   [🗑️]   │
│    128x128    Nice fragrant                       │
│               smell                              │
└──────────────────────────────────────────────────┘
```

**Grid Layout**:
- Checkbox: Column 1 (flex-shrink-0)
- Image: Column 2 (128x128, flex-shrink-0)
- Product Info: Column 3 (flex-1)
- Price & Action: Column 4 (flex-shrink-0)

**Quantity Controls**:
```
┌─────────────┐
│ − │ 1 │ + │
└─────────────┘
```
- Border: `border border-gray-300 rounded-lg`
- Buttons: `w-8 h-8` with hover effect
- Display: `flex items-center gap-2`

---

## 4. Order Summary Sidebar

**Visual Layout**:
```
┌──────────────────────┐
│  ORDER SUMMARY       │
├──────────────────────┤
│ Subtotal    $XX.XX   │
│ Shipping      FREE   │
│ Tax (est.)  $X.XX    │
├──────────────────────┤
│ Total       $XX.XX   │
│                      │
│  [Checkout (3)]      │
│ Continue Shopping    │
└──────────────────────┘
```

**Styling**:
- Background: `bg-gray-50 rounded-lg p-6`
- Position: `sticky top-20`
- Text: `text-sm` for lines, `text-lg font-bold` for total
- Button: `w-full px-6 py-3 bg-black text-white rounded-lg`

---

## 5. Cart Badge Animation

**Before Add to Cart**:
```
🛒          ❤️
```

**During Add to Cart** (0.5s animation):
```
🛒 ← animation path ← Product
```

**After Add to Cart**:
```
🛒     ❤️
[2]
```

**Animation Properties**:
- Duration: 0.5s
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (ease-out with overshoot)
- Final Scale: 0.3
- Shadow: 0 10px 20px rgba(0,0,0,0.2)
- GPU Acceleration: translateZ(0)

---

## 6. Wishlist Page Empty State

**Visual Layout**:
```
┌─────────────────────────────────────┐
│        MY WISHLIST                  │
│      __________                      │
│                                     │
│          ❤️ (large, light)          │
│                                     │
│    Your wishlist is empty            │
│  Start adding your favorite          │
│       fragrances                     │
│                                     │
│     [Browse Products]                │
│                                     │
└─────────────────────────────────────┘
```

**Styling**:
- Icon: `w-32 h-32 text-gray-300 stroke-1`
- Heading: `text-2xl font-bold text-gray-900`
- Button: `px-8 py-3 bg-black text-white rounded-lg`

---

## 7. Loading State

**Skeleton Loader**:
```
┌─────────────────────────────────────┐
│ [========] LOADING TITLE [========] │
│                                     │
│ [          large gray box          ] │
│                                     │
│ [    ][    ][    ]  Grid Layout    │
│ [    ][    ][    ]                 │
│ [    ][    ][    ]                 │
└─────────────────────────────────────┘
```

**CSS**:
- `animate-pulse` class creates shimmer effect
- `bg-gray-200` for placeholder boxes
- Multiple boxes to simulate content layout

---

## 8. Color Scheme

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Primary Button | Black | `bg-black` |
| Primary Button Hover | Dark Gray | `hover:bg-gray-800` |
| Border (Primary) | Black | `border-black` |
| Text (Primary) | Dark Gray | `text-gray-900` |
| Text (Secondary) | Gray | `text-gray-600` |
| Text (Tertiary) | Light Gray | `text-gray-500` |
| Background | White | `bg-white` |
| Background (Secondary) | Light Gray | `bg-gray-50` |
| Border (Secondary) | Light Gray | `border-gray-200` |
| Disabled State | Light Gray | `opacity-50` |
| Success | Green | `text-green-600` |
| Error | Red | `text-red-600` |

---

## 9. Typography

| Element | Size | Weight | Font | Class |
|---------|------|--------|------|-------|
| Page Title | 2xl | Bold | Header | `text-4xl font-header font-bold` |
| Section Title | xl | Semibold | Header | `text-xl font-semibold` |
| Card Title | lg | Semibold | Header | `text-lg font-semibold` |
| Body Text | base | Regular | Body | `text-base` |
| Small Text | sm | Regular | Body | `text-sm` |
| Tiny Text | xs | Regular | Body | `text-xs` |

---

## 10. Spacing Reference

| Purpose | Class | Value |
|---------|-------|-------|
| Very Tight | `gap-2` | 0.5rem |
| Tight | `gap-3` | 0.75rem |
| Normal | `gap-4` | 1rem |
| Spacious | `gap-6` | 1.5rem |
| Very Spacious | `gap-8` | 2rem |
| Page Padding | `px-4 py-8` | 1rem / 2rem |
| Component Padding | `p-4 p-6` | 1rem / 1.5rem |
| Section Margin | `mb-8` | 2rem |

---

## 11. Responsive Design

**Breakpoints**:
- Mobile: < 640px (single column)
- Tablet: 640px - 1024px (2 columns)
- Desktop: > 1024px (3+ columns)

**Cart Layout**:
```
Mobile (< 768px):
┌─────────┐
│ Cart    │
│ Items   │
│ (full)  │
├─────────┤
│ Summary │
│ (full)  │
└─────────┘

Desktop (> 768px):
┌─────────────────────────────┐
│     Cart Items (2/3)        │ Summary │
│                             │  (1/3)  │
│                             │         │
└─────────────────────────────┘
```

**Classes Used**:
- `md:grid-cols-3` - 3 columns on medium+ screens
- `md:col-span-2` - Cart items span 2 columns
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` - Product grid

---

## 12. Interactive Elements

### Button States

**Default**:
```
[  Continue Shopping  ]
```

**Hover**:
```
[  Continue Shopping  ] ← darker background
```

**Disabled**:
```
[     Checkout (0)    ] ← faded, no hover
```

**Active (Pressed)**:
```
[  Continue Shopping  ] ← scale down effect
```

### Checkbox States

**Unchecked**:
```
☐ Select all (3 items)
```

**Checked**:
```
☑ Select all (3 items)  [Delete All 3]
```

**Hover**:
```
☐ Select all (3 items)  ← cursor changes
```

### Badge Display

**Empty Cart**:
```
🛒 ← no badge
```

**With Items**:
```
🛒
[3] ← red background, white text, rounded
```

---

## 13. Animation Curves

**Cart Fly Animation**:
```
Path:          Starting Point
                    ↓
Product Position → Cart Icon Position
                    ↑
            easing: cubic-bezier(0.34, 1.56, 0.64, 1)
            
Easing Graph:
        ↗↘
       ↗  ↘
      ↗    ↘
     ↗      ↘
    ↗        ↘___
___/
```

This creates a "bounce" effect where the item overshoots slightly, then settles.

---

## 14. Accessibility Features

**Keyboard Navigation**:
- Tab key: Move between buttons and inputs
- Enter: Activate button or submit form
- Space: Toggle checkbox

**ARIA Labels**:
- Buttons: `aria-label="Profile"`
- Icon buttons: Descriptive label
- Badges: Announce count

**Color Contrast**:
- Black (#000) on White (#fff): 21:1 ✓ (exceeds WCAG AAA)
- Gray (#666) on White (#fff): 7:1 ✓ (meets WCAG AA)

**Touch Targets**:
- Buttons: Minimum 44x44px
- Checkboxes: 20x20px (acceptable)
- Icons: 24x24px or larger

---

## 15. Common Patterns

### Loading Pattern
1. Show skeleton with `animate-pulse`
2. Fetch data asynchronously
3. Replace skeleton with real content
4. Show error message if fetch fails

### Error Pattern
1. API returns error
2. Show toast notification with message
3. Keep UI state (don't clear everything)
4. Allow user to retry

### Success Pattern
1. Action completes successfully
2. Show success toast notification
3. Update relevant UI immediately
4. Optional: Auto-dismiss toast after 3s

### Confirmation Pattern
1. User attempts destructive action
2. Show browser confirmation dialog
3. If confirmed: Execute action
4. If cancelled: Do nothing

---

## Mobile-First Design Notes

- **Touch Friendly**: All interactive elements ≥ 44x44px
- **Readable**: Font sizes ≥ 16px on mobile
- **Responsive**: No horizontal scroll on small screens
- **Performance**: Images optimized for mobile
- **Gestures**: No hover states on touch devices only
- **Full Width**: Content uses full width on mobile

---

**Last Updated**: 2024  
**Theme**: Minimalist Modern (Black & White)  
**Framework**: Tailwind CSS + Next.js
