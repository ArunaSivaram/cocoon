import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node-side MSW for Vitest. Tests import `server` and call .listen/.close. */
export const server = setupServer(...handlers);
