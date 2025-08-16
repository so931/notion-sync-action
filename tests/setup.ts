// Global test setup
beforeAll(() => {
  // Setup test environment
});

afterAll(() => {
  // Cleanup
});

// Custom matchers
expect.extend({
  toBeValidUrl(received: string) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },
});

// Add custom matcher types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUrl(): R;
    }
  }
}