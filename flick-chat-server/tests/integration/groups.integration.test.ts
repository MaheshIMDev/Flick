import request from 'supertest';
import app from '@/server';
import { cleanupTestData } from '@/tests/setup/setupTests';
import { generateTestEmail } from '@/tests/fixtures/testData';

describe('Groups API - Integration Tests', () => {
  let ownerToken: string;
  let memberToken: string;
  let ownerId: string;
  let memberId: string;
  let groupId: string;
  const ownerEmail = generateTestEmail('group-owner');
  const memberEmail = generateTestEmail('group-member');

  beforeAll(async () => {
    // Create owner
    const owner = await request(app)
      .post('/auth/signup')
      .send({ email: ownerEmail, password: 'Test1234!' });
    
    ownerToken = owner.body.session.access_token;
    ownerId = owner.body.user.id;

    // Create member
    const member = await request(app)
      .post('/auth/signup')
      .send({ email: memberEmail, password: 'Test1234!' });
    
    memberToken = member.body.session.access_token;
    memberId = member.body.user.id;
  });

  afterAll(async () => {
    await cleanupTestData([ownerEmail, memberEmail]);
  });

  describe('GET /groups', () => {
    it('should return empty groups list initially', async () => {
      const response = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('groups');
      expect(Array.isArray(response.body.groups)).toBe(true);
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/groups');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /groups/create', () => {
    it('should create a new group', async () => {
      const response = await request(app)
        .post('/groups/create')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Group',
          description: 'A test group for integration testing',
          member_ids: [memberId],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('group');
      expect(response.body.group.name).toBe('Test Group');
      
      groupId = response.body.group.id;
    });

    it('should reject group creation without name', async () => {
      const response = await request(app)
        .post('/groups/create')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          description: 'Group without name',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('name');
    });

    it('should reject group creation without authorization', async () => {
      const response = await request(app)
        .post('/groups/create')
        .send({
          name: 'Unauthorized Group',
        });

      expect(response.status).toBe(401);
    });

    it('should create group with empty members list', async () => {
      const response = await request(app)
        .post('/groups/create')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Solo Group',
          description: 'Group with only owner',
          member_ids: [],
        });

      expect(response.status).toBe(200);
      expect(response.body.group.name).toBe('Solo Group');
    });
  });

  describe('Group Membership', () => {
    it('should show group in owner groups list', async () => {
      const response = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      const groups = response.body.groups;
      expect(groups.length).toBeGreaterThan(0);
      
      const testGroup = groups.find((g: any) => g.name === 'Test Group');
      expect(testGroup).toBeDefined();
    });

    it('should show group in member groups list', async () => {
      const response = await request(app)
        .get('/groups')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      const groups = response.body.groups;
      
      const testGroup = groups.find((g: any) => g.name === 'Test Group');
      expect(testGroup).toBeDefined();
    });
  });
});
