export const validateNickname = (nickname: string) => {
  const normalized = nickname.trim();
  if (!normalized) return 'Pick a nickname to enter the arena.';
  if (normalized.length > 18) return 'Keep your nickname under 18 characters.';
  if (!/^[\p{L}\p{N} _-]+$/u.test(normalized)) return 'Use letters, numbers, spaces, dashes, or underscores only.';
  return null;
};

export const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return null; // Optional field
  if (trimmed.length > 256) return 'Email address must not exceed 256 characters.';
  // Standard RFC 5322 compliant regex for practical email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g. player@example.com).';
  }
  return null;
};

/**
 * Normalizes an international phone number.
 * Supports international formats without assuming a single country code.
 * Strips formatting characters (spaces, dashes, dots, parentheses).
 */
export const normalizePhoneNumber = (phone: string): { normalized: string; error: string | null } => {
  const trimmed = phone.trim();
  if (!trimmed) return { normalized: '', error: null }; // Optional field

  if (trimmed.length > 30) {
    return { normalized: '', error: 'Phone number is too long (maximum 20 characters).' };
  }

  // Check for invalid characters (only digits, spaces, +, -, ., (, ) allowed)
  if (!/^[+\d\s().-]+$/.test(trimmed)) {
    return { normalized: '', error: 'Phone number may only contain digits, +, spaces, hyphens, or parentheses.' };
  }

  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  // International phone numbers typically range from 7 to 15 digits (ITU E.164)
  if (digitsOnly.length < 7) {
    return { normalized: '', error: 'Phone number is too short (at least 7 digits required).' };
  }
  if (digitsOnly.length > 15) {
    return { normalized: '', error: 'Phone number is too long (at most 15 digits allowed).' };
  }

  const normalized = hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
  return { normalized, error: null };
};

export const validatePhoneNumber = (phone: string): string | null => {
  return normalizePhoneNumber(phone).error;
};

export const formatScore = (score: number) => score.toLocaleString('en-US');
