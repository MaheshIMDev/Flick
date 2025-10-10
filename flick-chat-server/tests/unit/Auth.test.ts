describe('Auth Utilities - Unit Tests', () => {
    describe('Token Validation', () => {
      it('should validate token format', () => {
        const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        const isValid = validToken.split('.').length === 3;
        expect(isValid).toBe(true);
      });
  
      it('should reject invalid token format', () => {
        const invalidToken = 'invalid-token';
        const isValid = invalidToken.split('.').length === 3;
        expect(isValid).toBe(false);
      });
    });
  
    describe('User ID Validation', () => {
      it('should validate UUID format', () => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        expect(uuidRegex.test(validUUID)).toBe(true);
      });
  
      it('should reject invalid UUID format', () => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const invalidUUID = 'not-a-uuid';
        expect(uuidRegex.test(invalidUUID)).toBe(false);
      });
    });
  
    describe('Session Expiry', () => {
      it('should check if session is expired', () => {
        const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
        const isExpired = futureTimestamp < Math.floor(Date.now() / 1000);
        expect(isExpired).toBe(false);
      });
  
      it('should detect expired session', () => {
        const pastTimestamp = Math.floor(Date.now() / 1000) - 3600;
        const isExpired = pastTimestamp < Math.floor(Date.now() / 1000);
        expect(isExpired).toBe(true);
      });
    });
  
    describe('Password Strength', () => {
      const checkPasswordStrength = (password: string): string => {
        if (password.length < 8) return 'weak';
        // Fixed: Check for strong password correctly
        if (password.length >= 12 && password.match(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)) {
          return 'strong';
        }
        return 'medium';
      };
  
      it('should identify weak passwords', () => {
        expect(checkPasswordStrength('12345')).toBe('weak');
      });
  
      it('should identify medium strength passwords', () => {
        expect(checkPasswordStrength('Test1234')).toBe('medium');
      });
  
      it('should identify strong passwords', () => {
        expect(checkPasswordStrength('Test1234!@#A')).toBe('strong');
      });
    });
  });
  