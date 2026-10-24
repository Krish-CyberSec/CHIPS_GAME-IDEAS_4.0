import { describe, expect, it } from 'vitest';
import { validateNickname } from '../utils/validation';

describe('nickname validation', () => {
  it('rejects empty and overlong names', () => {
    expect(validateNickname('')).toBeTruthy();
    expect(validateNickname('a'.repeat(19))).toBeTruthy();
  });

  it('allows safe display names', () => {
    expect(validateNickname('Neon Nibbler')).toBeNull();
    expect(validateNickname('<script>')).toBeTruthy();
  });
});
