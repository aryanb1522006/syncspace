import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// UI fixtures use the demo store; a developer's live .env.local must not
// turn unit tests into unintended requests to a real API.
vi.stubEnv('VITE_DEMO_MODE', 'true');

Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
HTMLCanvasElement.prototype.getContext = () => null;
