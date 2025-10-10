export const testUsers = {
  userA: {
    email: `testA-${Date.now()}@test.com`,
    password: 'Test1234!',
  },
  userB: {
    email: `testB-${Date.now()}@test.com`,
    password: 'Test1234!',
  },
  userC: {
    email: `testC-${Date.now()}@test.com`,
    password: 'Test1234!',
  },
};

export const invalidCredentials = {
  invalidEmail: {
    email: 'not-an-email',
    password: 'Test1234!',
  },
  emptyPassword: {
    email: 'test@test.com',
    password: '',
  },
  shortPassword: {
    email: 'test@test.com',
    password: '123',
  },
};

// Shorter prefix to avoid database varchar limit
export function generateTestEmail(prefix: string = 'test'): string {
  const timestamp = Date.now().toString().slice(-6); // Only last 6 digits
  const random = Math.random().toString(36).substring(2, 5); // Only 3 chars
  return `${prefix}-${timestamp}${random}@t.co`;
}
