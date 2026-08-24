import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	base: '/flow-focus/',
	plugins: [react()],
	server: {
		port: 5174,
		strictPort: true,
	},
	test: {
		globals: true,
		environment: 'jsdom',
	},
});
