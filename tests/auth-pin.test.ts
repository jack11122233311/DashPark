import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';

describe('PIN Kiosk Protection & Auth Validation', () => {
  const hashPin = (pin: string) => {
    return crypto.createHash('sha256').update(pin.trim()).digest('hex');
  };

  it('should generate consistent SHA-256 hashes for master PIN', () => {
    const pin = '1234';
    const hash1 = hashPin(pin);
    const hash2 = hashPin('1234');
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('should correctly authenticate valid PIN and reject invalid PIN', () => {
    const masterPin = '8899';
    const storedHash = hashPin(masterPin);

    const userAttemptCorrect = '8899';
    const userAttemptWrong = '0000';

    expect(hashPin(userAttemptCorrect)).toBe(storedHash);
    expect(hashPin(userAttemptWrong)).not.toBe(storedHash);
  });
});
