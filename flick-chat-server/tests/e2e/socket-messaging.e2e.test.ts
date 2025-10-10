import { io as ioClient, Socket } from 'socket.io-client';
import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Socket.io Real-Time Messaging - E2E Test', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let conversationId: string;
  let socketA: Socket;
  let socketB: Socket;
  const userAEmail = generateTestEmail('socket-userA');
  const userBEmail = generateTestEmail('socket-userB');

  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

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

    // Connect via QR
    const qrGen = await request(app)
      .post('/friends/qr/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ max_uses: 1, expires_in_minutes: 60 });

    const scanResult = await request(app)
      .post('/friends/qr/scan')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ qr_code_value: qrGen.body.qr_code });

    conversationId = scanResult.body.conversation_id;

    // Initialize socket connections
    socketA = ioClient(SOCKET_URL, {
      auth: { token: userAToken },
      transports: ['websocket'],
    });

    socketB = ioClient(SOCKET_URL, {
      auth: { token: userBToken },
      transports: ['websocket'],
    });

    // Wait for connections
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

  describe('Socket Connection', () => {
    it('should connect both users successfully', () => {
      expect(socketA.connected).toBe(true);
      expect(socketB.connected).toBe(true);
    });

    it('should receive friend_online event', (done) => {
      socketB.once('friend_online', (data) => {
        expect(data.userId).toBe(userAId);
        done();
      });
    });
  });

  describe('Join Conversation', () => {
    it('should join conversation room', (done) => {
      socketA.emit('join_conversation', { conversationId });
      
      socketA.once('joined_conversation', (data) => {
        expect(data.conversationId).toBe(conversationId);
        done();
      });
    });
  });

  describe('Real-Time Messaging', () => {
    it('should send and receive messages in real-time', (done) => {
      const testMessage = 'Hello from E2E test!';
      const encryptedContent = Buffer.from(testMessage).toString('base64');

      // User B listens for message
      socketB.once('receive_message', (message) => {
        expect(message.encrypted_content).toBe(encryptedContent);
        expect(message.sender_id).toBe(userAId);
        expect(message.conversation_id).toBe(conversationId);
        done();
      });

      // User A sends message
      socketA.emit('send_message', {
        conversationId,
        encryptedContent,
        messageType: 'text',
      });
    });

    it('should handle message with reply', (done) => {
      const encryptedContent = Buffer.from('Reply test').toString('base64');
      let firstMessageId: string;

      // Send first message
      socketA.once('receive_message', (message) => {
        firstMessageId = message.id;

        // Send reply
        socketB.once('receive_message', (replyMessage) => {
          expect(replyMessage.reply_to_message_id).toBe(firstMessageId);
          done();
        });

        socketB.emit('send_message', {
          conversationId,
          encryptedContent,
          replyToId: firstMessageId,
        });
      });

      socketA.emit('send_message', {
        conversationId,
        encryptedContent,
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should broadcast typing indicators', (done) => {
      socketB.once('user_typing', (data) => {
        expect(data.userId).toBe(userAId);
        expect(data.conversationId).toBe(conversationId);
        done();
      });

      socketA.emit('typing_start', { conversationId });
    });

    it('should broadcast typing stopped', (done) => {
      socketB.once('user_stopped_typing', (data) => {
        expect(data.userId).toBe(userAId);
        done();
      });

      socketA.emit('typing_stop', { conversationId });
    });
  });

  describe('Read Receipts', () => {
    it('should send read receipts', (done) => {
      // Send message first
      socketA.once('receive_message', (message) => {
        // User B marks as read
        socketA.once('message_read', (data) => {
          expect(data.userId).toBe(userBId);
          expect(data.messageId).toBe(message.id);
          done();
        });

        socketB.emit('mark_read', {
          conversationId,
          messageId: message.id,
        });
      });

      socketA.emit('send_message', {
        conversationId,
        encryptedContent: Buffer.from('Read receipt test').toString('base64'),
      });
    });
  });

  describe('Online Status', () => {
    it('should get online friends list', (done) => {
      socketA.once('online_friends', (friends) => {
        expect(Array.isArray(friends)).toBe(true);
        const friendB = friends.find((f: any) => f.userId === userBId);
        expect(friendB).toBeDefined();
        expect(friendB.isOnline).toBe(true);
        done();
      });

      socketA.emit('get_online_friends');
    });
  });

  describe('Disconnect Handling', () => {
    it('should broadcast offline status on disconnect', (done) => {
      socketA.once('friend_offline', (data) => {
        expect(data.userId).toBe(userBId);
        done();
      });

      socketB.disconnect();
    });
  });
});
