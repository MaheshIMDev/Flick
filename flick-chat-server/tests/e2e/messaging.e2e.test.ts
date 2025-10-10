import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Complete Messaging Flow - E2E Test', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let conversationId: string;
  const userAEmail = generateTestEmail('e2e-msg-userA');
  const userBEmail = generateTestEmail('e2e-msg-userB');

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

  it('should complete full messaging flow: connect → verify conversation', async () => {
    // Step 1: User A generates QR code
    const qrGenResponse = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    expect(qrGenResponse.status).toBe(200);
    const qrCode = qrGenResponse.body.qr_code;

    // Step 2: User B scans QR code (this creates connection + conversation)
    const scanResponse = await request(app)
      .post('/friends/qr/scan')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ qr_code_value: qrCode });

    expect(scanResponse.status).toBe(200);
    expect(scanResponse.body).toHaveProperty('conversation_id');
    
    conversationId = scanResponse.body.conversation_id;

    // Step 3: Verify both users are friends
    const userAFriends = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(userAFriends.status).toBe(200);
    expect(userAFriends.body.friends.length).toBeGreaterThanOrEqual(1);
    
    const friendB = userAFriends.body.friends.find((f: any) => f.id === userBId);
    expect(friendB).toBeDefined();

    // Step 4: Verify User B also has User A as friend
    const userBFriends = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(userBFriends.status).toBe(200);
    const friendA = userBFriends.body.friends.find((f: any) => f.id === userAId);
    expect(friendA).toBeDefined();
  });

  it('should maintain connection state after multiple requests', async () => {
    // Verify connection persists
    const userAFriends = await request(app)
      .get('/friends')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(userAFriends.status).toBe(200);
    expect(userAFriends.body.friends.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle multiple QR code generations correctly', async () => {
    // Generate first QR
    const qr1 = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    expect(qr1.status).toBe(200);

    // Generate second QR (should deactivate first)
    const qr2 = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    expect(qr2.status).toBe(200);
    expect(qr2.body.qr_code).not.toBe(qr1.body.qr_code);
  });
});
