import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('QR Friend Connection - E2E Flow', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let qrCode: string;
  const userAEmail = generateTestEmail('e2e-userA');
  const userBEmail = generateTestEmail('e2e-userB');

  beforeAll(async () => {
    // Create User A
    const userA = await request(app)
      .post('/auth/signup')
      .send({ email: userAEmail, password: 'Test1234!' });
    
    userAToken = userA.body.session.access_token;
    userAId = userA.body.user.id;

    // Create User B
    const userB = await request(app)
      .post('/auth/signup')
      .send({ email: userBEmail, password: 'Test1234!' });
    
    userBToken = userB.body.session.access_token;
    userBId = userB.body.user.id;
  });

  afterAll(async () => {
    await cleanupTestData([userAEmail, userBEmail]);
  });

  it('should complete QR code friend connection flow', async () => {
    // Step 1: User A generates QR code
    const qrGenResponse = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    expect(qrGenResponse.status).toBe(200);
    qrCode = qrGenResponse.body.qr_code;

    // Step 2: User B scans QR code
    const scanResponse = await request(app)
      .post('/friends/qr/scan')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ qr_code_value: qrCode });

    expect(scanResponse.status).toBe(200);

    // Step 3: Verify User A's friends list
    const userAFriends = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(userAFriends.status).toBe(200);
    expect(userAFriends.body.friends.length).toBeGreaterThanOrEqual(1);

    // Step 4: Verify User B's friends list
    const userBFriends = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(userBFriends.status).toBe(200);
    expect(userBFriends.body.friends.length).toBeGreaterThanOrEqual(1);
  });
});
