// ABOUTME: Vitest configuration for unit and integration tests.
// ABOUTME: Tests use mocked fetch and InMemoryTransport, no real API calls.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
