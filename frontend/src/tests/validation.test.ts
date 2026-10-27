import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber, validateEmail, validateNickname, validatePhoneNumber } from '../utils/validation';

describe('Player Registration Validation', () => {
  describe('nickname validation', () => {
    it('rejects empty, whitespace-only, and overlong names', () => {
      expect(validateNickname('')).toBeTruthy();
      expect(validateNickname('   ')).toBeTruthy();
      expect(validateNickname('a'.repeat(19))).toBeTruthy();
    });

    it('allows valid safe display names and trims whitespace', () => {
      expect(validateNickname('Neon Nibbler')).toBeNull();
      expect(validateNickname('Biter_99')).toBeNull();
      expect(validateNickname('Player-One')).toBeNull();
      expect(validateNickname('<script>')).toBeTruthy();
      expect(validateNickname('drop table;')).toBeTruthy();
    });
  });

  describe('email validation', () => {
    it('allows empty email since contact registration is optional', () => {
      expect(validateEmail('')).toBeNull();
      expect(validateEmail('   ')).toBeNull();
    });

    it('validates proper email formats', () => {
      expect(validateEmail('player@example.com')).toBeNull();
      expect(validateEmail('bite.master+tag@domain.co.uk')).toBeNull();
    });

    it('rejects invalid email formats and excessively long inputs', () => {
      expect(validateEmail('plainaddress')).toBeTruthy();
      expect(validateEmail('missingdomain@.com')).toBeTruthy();
      expect(validateEmail('@missingusername.com')).toBeTruthy();
      expect(validateEmail('user@domain')).toBeTruthy();
      expect(validateEmail(`${'a'.repeat(250)}@example.com`)).toBeTruthy();
    });
  });

  describe('phone number normalization and validation', () => {
    it('allows empty phone number since contact registration is optional', () => {
      expect(validatePhoneNumber('')).toBeNull();
      expect(normalizePhoneNumber('').normalized).toBe('');
    });

    it('normalizes international phone numbers and strips formatting characters', () => {
      const us = normalizePhoneNumber('+1 (555) 234-5678');
      expect(us.error).toBeNull();
      expect(us.normalized).toBe('+15552345678');

      const uk = normalizePhoneNumber('+44 20 7946 0958');
      expect(uk.error).toBeNull();
      expect(uk.normalized).toBe('+442079460958');

      const inNum = normalizePhoneNumber('+91 98765 43210');
      expect(inNum.error).toBeNull();
      expect(inNum.normalized).toBe('+919876543210');

      const noPlus = normalizePhoneNumber('555-123-4567');
      expect(noPlus.error).toBeNull();
      expect(noPlus.normalized).toBe('5551234567');
    });

    it('rejects numbers with illegal characters or invalid lengths', () => {
      expect(validatePhoneNumber('abc1234567')).toBeTruthy();
      expect(validatePhoneNumber('12345')).toBeTruthy(); // too short (< 7 digits)
      expect(validatePhoneNumber('+1234567890123456789')).toBeTruthy(); // too long (> 15 digits)
      expect(validatePhoneNumber('1234567890123456789012345678901')).toBeTruthy(); // > 30 chars
    });
  });
});
