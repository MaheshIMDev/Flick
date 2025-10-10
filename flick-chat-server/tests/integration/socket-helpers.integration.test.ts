import { 
    broadcastToFriends, 
    getConversationParticipants, 
    generateMessageId, 
    sanitizeMessage 
  } from '@/utils/socketHelpers';
  import { supabase } from '@/utils/supabaseClient';
  import request from 'supertest';
  import app from '@/server';
  import { cleanupTestData } from '@/tests/setup/setupTests';
  import { generateTestEmail } from '@/tests/fixtures/testData';
  
  describe('Socket Helpers - Integration Tests', () => {
    let userAId: string;
    let userBId: string;
    let conversationId: string;
    const userAEmail = generateTestEmail('helper-userA');
    const userBEmail = generateTestEmail('helper-userB');
  
    beforeAll(async () => {
      const userA = await request(app)
        .post('/auth/signup')
        .send({ email: userAEmail, password: 'Test1234!' });
      
      userAId = userA.body.user.id;
  
      const userB = await request(app)
        .post('/auth/signup')
        .send({ email: userBEmail, password: 'Test1234!' });
      
      userBId = userB.body.user.id;
  
      // Connect users
      const qrGen = await request(app)
        .post('/friends/qr/generate')
        .set('Authorization', `Bearer ${userA.body.session.access_token}`)
        .send({ max_uses: 1, expires_in_minutes: 60 });
  
      const scanResult = await request(app)
        .post('/friends/qr/scan')
        .set('Authorization', `Bearer ${userB.body.session.access_token}`)
        .send({ qr_code_value: qrGen.body.qr_code });
  
      conversationId = scanResult.body.conversation_id;
    });
  
    afterAll(async () => {
      await cleanupTestData([userAEmail, userBEmail]);
    });
  
    describe('getConversationParticipants', () => {
      it('should return all participants', async () => {
        const participants = await getConversationParticipants(conversationId);
        
        expect(participants).toHaveLength(2);
        expect(participants).toContain(userAId);
        expect(participants).toContain(userBId);
      });
  
      it('should return empty array for non-existent conversation', async () => {
        const participants = await getConversationParticipants('fake-conversation-id');
        expect(participants).toHaveLength(0);
      });
    });
  
    describe('generateMessageId', () => {
      it('should generate unique message IDs', () => {
        const id1 = generateMessageId();
        const id2 = generateMessageId();
        
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
      });
    });
  
    describe('sanitizeMessage', () => {
      it('should escape HTML tags', () => {
        const input = '<script>alert("xss")</script>';
        const output = sanitizeMessage(input);
        
        expect(output).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      });
  
      it('should trim whitespace', () => {
        const input = '  hello world  ';
        const output = sanitizeMessage(input);
        
        expect(output).toBe('hello world');
      });
  
      it('should handle empty strings', () => {
        expect(sanitizeMessage('')).toBe('');
        expect(sanitizeMessage('   ')).toBe('');
      });
    });
  });
  