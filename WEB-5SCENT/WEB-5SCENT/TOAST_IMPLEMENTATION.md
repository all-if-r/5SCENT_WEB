# 🍞 Toast Notification System

Guide to using the toast notification system in 5SCENT.

## Overview

The toast system provides user-friendly notifications for success, error, and info messages throughout the application.

## Implementation

### Context Provider

The toast system is implemented using React Context in `contexts/ToastContext.tsx`.

### Usage

1. **Import the hook**:
```tsx
import { useToast } from '@/contexts/ToastContext';
```

2. **Get the showToast function**:
```tsx
const { showToast } = useToast();
```

3. **Show notifications**:
```tsx
// Success message
showToast('Order placed successfully!', 'success');

// Error message
showToast('Failed to add to cart', 'error');

// Info message
showToast('Please login to continue', 'info');
```

## Toast Types

- **success**: Green toast with checkmark icon
- **error**: Red toast with X icon
- **info**: Blue toast with info icon (default)

## Examples

### In Components

```tsx
'use client';

import { useToast } from '@/contexts/ToastContext';

export default function MyComponent() {
  const { showToast } = useToast();

  const handleAction = async () => {
    try {
      await someApiCall();
      showToast('Action completed successfully!', 'success');
    } catch (error) {
      showToast('Action failed', 'error');
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### In API Calls

```tsx
const handleSubmit = async () => {
  try {
    await api.post('/endpoint', data);
    showToast('Saved successfully', 'success');
  } catch (error: any) {
    showToast(
      error.response?.data?.message || 'An error occurred',
      'error'
    );
  }
};
```

## Toast Display

- Toasts appear in the **top-right corner**
- Auto-dismiss after **5 seconds**
- Can be manually closed with X button
- Multiple toasts stack vertically
- Smooth animations using Framer Motion

## Best Practices

1. **Be specific**: Use clear, actionable messages
2. **Use appropriate types**: Match toast type to message context
3. **Handle errors gracefully**: Show user-friendly error messages
4. **Don't overuse**: Only show toasts for important actions

## Customization

To customize toast appearance, edit `contexts/ToastContext.tsx`:

- Change duration: Modify `setTimeout` value (default: 5000ms)
- Change position: Modify `fixed top-4 right-4` classes
- Change colors: Modify background and text color classes
- Change icons: Replace Heroicons with custom icons



