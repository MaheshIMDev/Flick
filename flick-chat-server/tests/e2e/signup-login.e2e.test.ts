import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Signup → Login Flow - E2E Test', () => {
  const userEmail = generateTestEmail('e2e-signup-login');
  const userPassword = 'Test1234!';
  let accessToken: string;
  let userId: string;

  afterAll(async () => {
    await cleanupTestData([userEmail]);
  });

  it('should complete full signup and login flow', async () => {
    // Step 1: Signup
    const signupResponse = await request(app)
      .post('/auth/signup')
      .send({ email: userEmail, password: userPassword });

    expect(signupResponse.status).toBe(200);
    expect(signupResponse.body.user).toHaveProperty('id');
    expect(signupResponse.body.user).toHaveProperty('username');
    
    userId = signupResponse.body.user.id;

    // Step 2: Login
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: userEmail, password: userPassword });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.session).toHaveProperty('access_token');
    
    accessToken = loginResponse.body.session.access_token;

    // Step 3: Access Protected Route
    const profileResponse = await request(app)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.user.id).toBe(userId);
    expect(profileResponse.body.user.email).toBe(userEmail);
  });
});
