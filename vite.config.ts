import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function contentSecurityPolicy(apiUrl: string): Plugin {
  const apiOrigin = apiUrl ? new URL(apiUrl).origin : '';
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    `connect-src 'self' ${apiOrigin}`.trim(),
    "img-src 'self' data: blob:",
    "style-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');

  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
      { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head' },
    ],
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: '/pdf-insight/',
    plugins: [react(), contentSecurityPolicy(env.VITE_API_URL ?? '')],
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
    },
  };
});
