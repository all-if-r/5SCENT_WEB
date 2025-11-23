/**
 * Validates password and returns a comprehensive error message if validation fails
 * Returns null if password is valid
 */
export function validatePassword(password: string): string | null {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('upper case letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('lower case letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('symbol');
  }
  
  if (errors.length > 0) {
    // Format: "Password must be at least 8 characters and include upper and lower case letters, a number, and a symbol."
    if (errors.length === 1) {
      return `Password must be ${errors[0]}.`;
    } else if (errors.length === 2) {
      return `Password must be ${errors[0]} and include a ${errors[1]}.`;
    } else if (errors.length === 3) {
      return `Password must be ${errors[0]} and include ${errors[1]}, and a ${errors[2]}.`;
    } else if (errors.length === 4) {
      return `Password must be ${errors[0]} and include ${errors[1]}, ${errors[2]}, and a ${errors[3]}.`;
    } else {
      return `Password must be ${errors[0]} and include ${errors.slice(1, -1).join(', ')}, and a ${errors[errors.length - 1]}.`;
    }
  }
  
  return null;
}

/**
 * Returns password rules as an array for display
 */
export function getPasswordRules(): string[] {
  return [
    'Minimum 8 characters',
    'Must contain at least one uppercase letter',
    'Must contain at least one lowercase letter',
    'Must contain at least one number',
    'Must contain at least one symbol',
  ];
}

