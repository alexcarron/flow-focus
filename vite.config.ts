import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	base: '/flow-focus/',
	plugins: [react(), tailwindcss()],
	server: {
		port: 5174,
		strictPort: true,
	},
	test: {
		globals: true,
		environment: 'jsdom',
	},
});
