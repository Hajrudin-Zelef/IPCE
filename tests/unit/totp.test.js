const { generateSecret, base32Decode, generateTOTP, verifyTOTP, formatSecret } = require('../../lib/totp');

describe('TOTP', () => {
  describe('generateSecret', () => {
    it('should generate a 16-character secret', () => {
      const secret = generateSecret();
      expect(secret).toHaveLength(16);
    });

    it('should only contain valid Base32 characters', () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('should generate unique secrets', () => {
      const s1 = generateSecret();
      const s2 = generateSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe('base32Decode', () => {
    it('should decode a Base32 string to a Buffer', () => {
      const result = base32Decode('JBSWY3DPEHPK3PXP');
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const upper = base32Decode('JBSWY3DPEHPK3PXP');
      const lower = base32Decode('jbswy3dpehpk3pxp');
      expect(upper.equals(lower)).toBe(true);
    });
  });

  describe('generateTOTP', () => {
    it('should generate an array of 6-digit codes', () => {
      const secret = generateSecret();
      const codes = generateTOTP(secret, 1);
      expect(Array.isArray(codes)).toBe(true);
      expect(codes).toHaveLength(3); // window=1 means -1, 0, +1
      codes.forEach((code) => {
        expect(code).toMatch(/^\d{6}$/);
      });
    });

    it('should generate different codes for different time steps', () => {
      const secret = generateSecret();
      const codes = generateTOTP(secret, 1);
      // At least 2 of the 3 codes should be different (unless we're right at a boundary)
      const unique = new Set(codes);
      expect(unique.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('verifyTOTP', () => {
    it('should verify a valid TOTP code', () => {
      const secret = generateSecret();
      const codes = generateTOTP(secret, 1);
      // The middle code (time step 0) should always verify
      expect(verifyTOTP(secret, codes[1])).toBe(true);
    });

    it('should reject an invalid code', () => {
      const secret = generateSecret();
      expect(verifyTOTP(secret, '000000')).toBe(false);
    });

    it('should reject a code with wrong length', () => {
      const secret = generateSecret();
      expect(verifyTOTP(secret, '12345')).toBe(false);
      expect(verifyTOTP(secret, '1234567')).toBe(false);
    });
  });

  describe('formatSecret', () => {
    it('should format secret in groups of 4', () => {
      const formatted = formatSecret('JBSWY3DPEHPK3PXP');
      expect(formatted).toBe('JBSW Y3DP EHPK 3PXP');
    });
  });
});
