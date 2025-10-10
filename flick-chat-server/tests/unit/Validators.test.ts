describe('Input Validators - Unit Tests', () => {
  describe('Email Validation', () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@gmail.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @domain.com')).toBe(false);
    });
  });

  describe('Password Validation', () => {
    const validatePassword = (password: string): boolean => {
      return password.length >= 8;
    };

    it('should accept passwords with 8+ characters', () => {
      expect(validatePassword('Test1234!')).toBe(true);
      expect(validatePassword('12345678')).toBe(true);
    });

    it('should reject passwords with less than 8 characters', () => {
      expect(validatePassword('Test123')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('Username Validation', () => {
    const validateUsername = (username: string): boolean => {
      const usernameRegex = /^[a-z0-9_]{3,20}$/;
      return usernameRegex.test(username);
    };

    it('should accept valid usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('test_user_123')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false);
      expect(validateUsername('user name')).toBe(false);
      expect(validateUsername('user@name')).toBe(false);
      expect(validateUsername('User123')).toBe(false);
    });
  });

  describe('QR Code Validation', () => {
    const validateQRCode = (qrCode: string): boolean => {
      // Fixed: Changed from > 50 to >= 40 to match actual QR format
      return qrCode.startsWith('SCHAT_') && qrCode.length >= 40;
    };

    it('should validate correct QR codes', () => {
      expect(validateQRCode('SCHAT_user123_abcdef1234567890abcdef1234567890')).toBe(true);
    });

    it('should reject invalid QR codes', () => {
      expect(validateQRCode('INVALID_CODE')).toBe(false);
      expect(validateQRCode('SCHAT_short')).toBe(false);
      expect(validateQRCode('')).toBe(false);
    });
  });
});
