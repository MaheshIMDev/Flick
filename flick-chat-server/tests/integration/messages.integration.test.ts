import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Messages API - Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let conversationId: string;
  const userAEmail = generateTestEmail('msg-userA');
  const userBEmail = generateTestEmail('msg-userB');

  beforeAll(async () => {
    // Create users and connect them
    const userA = await request(app)
      .post('/auth/signup')
      .send({ email: userAEmail, password: 'Test1234!' });
    
    userAToken = userA.body.session.access_token;
    userAId = userA.body.user.id;

    const userB = await request(app)
      .post('/auth/signup')
      .send({ email: userBEmail, password: 'Test1234!' });
    
    userBToken = userB.body.session.access_token;
    userBId = userB.body.user.id;

    // Connect users via QR
    const qrGen = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    const scanResult = await request(app)
      .post('/friends/qr/scan')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ qr_code_value: qrGen.body.qr_code });

    conversationId = scanResult.body.conversation_id;
  });

  afterAll(async () => {
    await cleanupTestData([userAEmail, userBEmail]);
  });

  describe('GET /messages/conversation/:conversationId', () => {
    it('should fetch messages from conversation', async () => {
      const response = await request(app)
        .get(`/messages/conversation/${conversationId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      const response = await request(app)
        .get(`/messages/conversation/${conversationId}`);

      expect(response.status).toBe(401);
    });

    it('should reject access to conversation user is not part of', async () => {
      // Create third user
      const userC = await request(app)
        .post('/auth/signup')
        .send({ email: generateTestEmail('msg-userC'), password: 'Test1234!' });

      const response = await request(app)
        .get(`/messages/conversation/${conversationId}`)
        .set('Authorization', `Bearer ${userC.body.session.access_token}`);

      expect(response.status).toBe(403);
    });

    it('should support pagination with before parameter', async () => {
      const response = await request(app)
        .get(`/messages/conversation/${conversationId}?limit=10&before=${new Date().toISOString()}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.messages.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /messages/unread/:conversationId', () => {
    it('should return unread count', async () => {
      const response = await request(app)
        .get(`/messages/unread/${conversationId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('unreadCount');
      expect(typeof response.body.unreadCount).toBe('number');
    });
  });

  describe('POST /messages/read/:conversationId', () => {
    it('should mark conversation as read', async () => {
      const response = await request(app)
        .post(`/messages/read/${conversationId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify unread count is now 0
      const unreadResponse = await request(app)
        .get(`/messages/unread/${conversationId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(unreadResponse.body.unreadCount).toBe(0);
    });
  });

  describe('GET /messages/search/:conversationId', () => {
    it('should search messages in conversation', async () => {
      const response = await request(app)
        .get(`/messages/search/${conversationId}?query=test`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('messages');
    });

    it('should require search query', async () => {
      const response = await request(app)
        .get(`/messages/search/${conversationId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /messages/media/:conversationId', () => {
    it('should fetch media from conversation', async () => {
      const response = await request(app)
        .get(`/messages/media/${conversationId}?type=image`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('media');
      expect(Array.isArray(response.body.media)).toBe(true);
    });
  });
});
