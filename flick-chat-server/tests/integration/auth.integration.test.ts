import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Auth API - Integration Tests', () => {
  const testEmail = generateTestEmail('auth-integration');
  const testPassword = 'Test1234!';
  let accessToken: string;
  let userId: string;

  afterAll(async () => {
    await cleanupTestData([testEmail]);
  });

  describe('POST /auth/signup', () => {
    it('should successfully create a new user', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user).toHaveProperty('username');
      
      userId = response.body.user.id;
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject signup with missing password', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: generateTestEmail('no-password'),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('session');
      expect(response.body.session).toHaveProperty('access_token');
      
      accessToken = response.body.session.access_token;
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testPassword,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.id).toBe(userId);
    });

    it('should reject request without authorization token', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(401);
    });
  });
});
