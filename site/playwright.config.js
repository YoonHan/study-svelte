import { defineConfig } from '@playwright/test';

/**
 * Rendering tests: things that only show up when the page is drawn (a card cut off by the
 * window, a fill that leaves a corner empty, a note's arrow pointing at the wrong place).
 * `npm run test:render`
 */
export default defineConfig({
	testDir: 'tests',
	timeout: 120_000,
	// every test opens its own page, so they can run side by side (the suite was ~4.5 min alone)
	fullyParallel: true,
	workers: 4,
	use: {
		baseURL: 'http://localhost:5181',
		viewport: { width: 1280, height: 900 },
		colorScheme: 'light'
	},
	webServer: {
		command: 'npm run dev -- --port 5181 --strictPort',
		url: 'http://localhost:5181',
		reuseExistingServer: false,
		timeout: 180_000
	}
});
