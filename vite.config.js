import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE_PATH || '/';

  return {
    base,
    build: {
      sourcemap: mode === 'development',
    },
  };
});
