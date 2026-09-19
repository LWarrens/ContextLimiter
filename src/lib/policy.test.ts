import { describe, expect, it } from 'vitest';
import { decideUrlAction, globMatches, normalizeUrlPattern } from './policy';

describe('URL rule policy', () => {
	it('normalizes the domain examples presented in settings', () => {
		expect(normalizeUrlPattern('example.com')).toBe('*://example.com/*');
		expect(globMatches('https://example.com/path', 'example.com')).toBe(true);
		expect(globMatches('https://docs.example.com/path', '*.example.com')).toBe(true);
	});

	it('uses the first enabled matching rule', () => {
		expect(decideUrlAction('https://example.com/path', [
			{ pattern: 'example.com', action: 'ignore' },
			{ pattern: '*', action: 'count' }
		], 'count').action).toBe('ignore');
	});
});
