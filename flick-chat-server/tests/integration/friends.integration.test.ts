import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Friends API - Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  const userAEmail = generateTestEmail('friendsA');
  const userBEmail = generateTestEmail('friendsB');

  beforeAll(async () => {
    // Create test users
    const userA = await request(app)
      .post('/auth/signup')
      .send({ email: userAEmail, password: 'Test1234!' });
    
    const userB = await request(app)
      .post('/auth/signup')
      .send({ email: userBEmail, password: 'Test1234!' });

    userAToken = userA.body.session.access_token;
    userBToken = userB.body.session.access_token;
    userAId = userA.body.user.id;
    userBId = userB.body.user.id;
  });

  afterAll(async () => {
    await cleanupTestData([userAEmail, userBEmail]);
  });

  describe('GET /friends/search', () => {
    it('should search users by email', async () => {
      const response = await request(app)
        .get(`/friends/search?query=${userBEmail}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should reject search without query', async () => {
      const response = await request(app)
        .get('/friends/search')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(400);
    });

    it('should reject search without authorization', async () => {
      const response = await request(app)
        .get('/friends/search?query=test');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /friends', () => {
    it('should return friends list', async () => {
      const response = await request(app)
        .get('/friends')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('friends');
      expect(Array.isArray(response.body.friends)).toBe(true);
    });
  });
});
