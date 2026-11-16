// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages user site: served at the domain root, so `base` stays '/'.
export default defineConfig({
	site: 'https://explainable_uncertainty.github.io',
	base: '/',

	// Predictable URL handling: no trailing-slash redirects.
	trailingSlash: 'ignore',
});
