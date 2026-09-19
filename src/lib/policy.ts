import type { FilterAction, FilterRule } from './types';

export interface RuleDecision {
	action: FilterAction;
	matchedRule?: FilterRule;
}

/** Rules are URL globs. Bare domains match the complete URL the worker sees. */
export function normalizeUrlPattern(pattern: string): string {
	const value = pattern.trim();
	if (!value || value.includes('://') || value === '*') return value;
	if (value.includes('/') || value.includes('.')) return `*://${value}/*`;
	return value;
}

export function isValidUrlPattern(pattern: string): boolean {
	const value = pattern.trim();
	return value.length > 0 && value.length <= 512 && !/[\r\n]/.test(value);
}

export function globMatches(value: string, pattern: string): boolean {
	const expression = normalizeUrlPattern(pattern)
		.replace(/([.+^=!:${}()|[\]\\])/g, '\\$1')
		.replace(/\*/g, '.*')
		.replace(/\?/g, '.');
	return new RegExp(`^${expression}$`, 'i').test(value);
}

export function decideUrlAction(url: string, rules: FilterRule[], defaultAction: FilterAction): RuleDecision {
	for (const rule of rules) {
		if (rule.enabled !== false && globMatches(url, rule.pattern)) return { action: rule.action, matchedRule: rule };
	}
	return { action: defaultAction };
}
