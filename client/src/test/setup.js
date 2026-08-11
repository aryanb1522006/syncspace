import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
HTMLCanvasElement.prototype.getContext = () => null;
