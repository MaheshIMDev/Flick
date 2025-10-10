import { io as ioClient, Socket } from 'socket.io-client';
import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Socket.io Presence & Status - E2E Test', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let socketA: Socket;
  let socketB: Socket;
  const userAEmail = generateTestEmail('presence-userA');
  const userBEmail = generateTestEmail('presence-userB');
  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

  beforeAll(async () => {
    // Create users
    const userA = await request(app)
      .post('/auth/signup')
      .send({ email: userAEmail, password: 'Test1234!' });
    
    userAToken = userA.body.session.access_token;
    userAId = userA.body.user.id;

    const userB = await request(app)
      .post('/auth/signup')
      .send({ email: userBEmail, password: 'Test1234!' });
    
    userBToken = userB.body.session.access_token;

    // Connect them as friends
    const qrGen = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    await request(app)
      .post('/friends/qr/scan')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ qr_code_value: qrGen.body.qr_code });

    // Connect sockets
    socketA = ioClient(SOCKET_URL, {
      auth: { token: userAToken },
      transports: ['websocket'],
    });

    socketB = ioClient(SOCKET_URL, {
      auth: { token: userBToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>(resolve => socketA.on('connect', () => resolve())),
      new Promise<void>(resolve => socketB.on('connect', () => resolve())),
    ]);
  });

  afterAll(async () => {
    socketA?.disconnect();
    socketB?.disconnect();
    await cleanupTestData([userAEmail, userBEmail]);
  });

  it('should broadcast online status to friends', (done) => {
    socketB.once('friend_online', (data) => {
      expect(data.userId).toBe(userAId);
      expect(data).toHaveProperty('timestamp');
      done();
    });

    // Reconnect socketA to trigger online event
    socketA.disconnect();
    socketA.connect();
  });

  it('should update presence status', (done) => {
    socketB.once('friend_presence_update', (data) => {
      expect(data.userId).toBe(userAId);
      expect(data.status).toBe('away');
      done();
    });

    socketA.emit('update_presence', { status: 'away' });
  });

  it('should handle heartbeat to stay online', (done) => {
    socketA.emit('heartbeat');
    
    setTimeout(() => {
      socketA.emit('get_online_friends');
      socketA.once('online_friends', (friends) => {
        const self = friends.find((f: any) => f.userId === userAId);
        expect(self).toBeDefined();
        done();
      });
    }, 100);
  });

  it('should broadcast offline status on disconnect', (done) => {
    const tempSocket = ioClient(SOCKET_URL, {
      auth: { token: userAToken },
      transports: ['websocket'],
    });

    tempSocket.on('connect', () => {
      socketB.once('friend_offline', (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('lastSeen');
        done();
      });

      tempSocket.disconnect();
    });
  });
});
