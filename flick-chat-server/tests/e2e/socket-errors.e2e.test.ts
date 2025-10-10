import { io as ioClient, Socket } from 'socket.io-client';
import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Socket.io Error Handling - E2E Test', () => {
  let userToken: string;
  let conversationId: string;
  let socket: Socket;
  const userEmail = generateTestEmail('errors-user');
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

  beforeAll(async () => {
    const user = await request(app)
      .post('/auth/signup')
      .send({ email: userEmail, password: 'Test1234!' });
    
    userToken = user.body.session.access_token;

    // Create a conversation
    const group = await request(app)
      .post('/groups/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Test Group', member_ids: [] });

    conversationId = group.body.group.id;
  });

  afterAll(async () => {
    socket?.disconnect();
    await cleanupTestData([userEmail]);
  });

  it('should reject connection without token', (done) => {
    const badSocket = ioClient(SOCKET_URL, {
      auth: {},
      transports: ['websocket'],
    });

    badSocket.on('connect_error', (error) => {
      expect(error.message).toContain('Authentication');
      badSocket.disconnect();
      done();
    });
  });

  it('should reject connection with invalid token', (done) => {
    const badSocket = ioClient(SOCKET_URL, {
      auth: { token: 'invalid-token-123' },
      transports: ['websocket'],
    });

    badSocket.on('connect_error', (error) => {
      expect(error.message).toContain('Invalid');
      badSocket.disconnect();
      done();
    });
  });

  it('should handle rate limiting on message send', (done) => {
    socket = ioClient(SOCKET_URL, {
      auth: { token: userToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      // Send 61 messages rapidly (rate limit is 60/min)
      for (let i = 0; i < 61; i++) {
        socket.emit('send_message', {
          conversationId,
          encryptedContent: Buffer.from(`Spam ${i}`).toString('base64'),
        });
      }

      socket.once('error', (error) => {
        expect(error.message).toContain('Rate limit');
        done();
      });
    });
  });

  it('should reject join to non-existent conversation', (done) => {
    socket = ioClient(SOCKET_URL, {
      auth: { token: userToken },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('join_conversation', { 
        conversationId: 'non-existent-conversation-id' 
      });

      socket.once('error', (error) => {
        expect(error.message).toContain('participant');
        done();
      });
    });
  });
});
