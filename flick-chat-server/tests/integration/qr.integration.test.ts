import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('QR Code API - Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let qrCode: string;
  const userAEmail = generateTestEmail('qrA');
  const userBEmail = generateTestEmail('qrB');

  beforeAll(async () => {
    const userA = await request(app)
      .post('/auth/signup')
      .send({ email: userAEmail, password: 'Test1234!' });
    userAToken = userA.body.session.access_token;

    const userB = await request(app)
      .post('/auth/signup')
      .send({ email: userBEmail, password: 'Test1234!' });
    userBToken = userB.body.session.access_token;
  });

  afterAll(async () => {
    await cleanupTestData([userAEmail, userBEmail]);
  });

  describe('POST /friends/qr/generate', () => {
    it('should generate QR code successfully', async () => {
      const response = await request(app)
        .post('/friends/qr/generate')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ max_uses: 1, expires_in_minutes: 60 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('qr_code');
      expect(response.body).toHaveProperty('expires_at');
      expect(response.body.qr_code).toContain('SCHAT_');
      
      qrCode = response.body.qr_code;
    });

    it('should reject QR generation without authorization', async () => {
      const response = await request(app)
        .post('/friends/qr/generate')
        .send({ max_uses: 1 });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /friends/qr/scan', () => {
    it('should scan QR code and add friend', async () => {
      const response = await request(app)
        .post('/friends/qr/scan')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ qr_code_value: qrCode });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('friends');
    });

    it('should reject scanning same QR code twice', async () => {
      const response = await request(app)
        .post('/friends/qr/scan')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ qr_code_value: qrCode });

      expect(response.status).toBe(400);
    });

    it('should reject invalid QR code', async () => {
      const response = await request(app)
        .post('/friends/qr/scan')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ qr_code_value: 'INVALID_QR_CODE' });

      expect(response.status).toBe(404);
    });
  });
});
