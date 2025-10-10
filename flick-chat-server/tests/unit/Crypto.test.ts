import { generateKeyBundle } from '@/utils/crypto';
import sodium from 'libsodium-wrappers';

describe('Crypto Utilities - Unit Tests', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  describe('generateKeyBundle', () => {
    it('should generate valid key bundle with all required fields', async () => {
      const userId = 'test-user-123';
      const keyBundle = await generateKeyBundle(userId);

      expect(keyBundle).toHaveProperty('identity_public_key');
      expect(keyBundle).toHaveProperty('signed_prekey_id');
      expect(keyBundle).toHaveProperty('signed_prekey_public');
      expect(keyBundle).toHaveProperty('signed_prekey_signature');
      expect(keyBundle).toHaveProperty('prekeys');
      expect(Array.isArray(keyBundle.prekeys)).toBe(true);
    });

    it('should generate exactly 100 prekeys', async () => {
      const keyBundle = await generateKeyBundle('test-user-456');
      expect(keyBundle.prekeys).toHaveLength(100);
    });

    it('should generate unique prekey IDs from 1 to 100', async () => {
      const keyBundle = await generateKeyBundle('test-user-789');
      const prekeyIds = keyBundle.prekeys.map(pk => pk.prekey_id);
      const uniqueIds = new Set(prekeyIds);

      expect(uniqueIds.size).toBe(100);
      expect(Math.min(...prekeyIds)).toBe(1);
      expect(Math.max(...prekeyIds)).toBe(100);
    });

    it('should generate valid base64 encoded keys', async () => {
      const keyBundle = await generateKeyBundle('test-user-base64');
      
      // Updated regex to support URL-safe base64 (allows _ and -)
      const base64Regex = /^[A-Za-z0-9+/_-]+=*$/;
      expect(keyBundle.identity_public_key).toMatch(base64Regex);
      expect(keyBundle.signed_prekey_public).toMatch(base64Regex);
      expect(keyBundle.signed_prekey_signature).toMatch(base64Regex);
      expect(keyBundle.prekeys[0].prekey_public).toMatch(base64Regex);
    });

    it('should generate different keys for different users', async () => {
      const keyBundle1 = await generateKeyBundle('user-1');
      const keyBundle2 = await generateKeyBundle('user-2');

      expect(keyBundle1.identity_public_key).not.toBe(keyBundle2.identity_public_key);
      expect(keyBundle1.signed_prekey_public).not.toBe(keyBundle2.signed_prekey_public);
    });

    it('should set correct user_id for all prekeys', async () => {
      const userId = 'test-user-prekeys';
      const keyBundle = await generateKeyBundle(userId);

      keyBundle.prekeys.forEach(prekey => {
        expect(prekey.user_id).toBe(userId);
        expect(prekey).toHaveProperty('created_at');
      });
    });
  });
});
