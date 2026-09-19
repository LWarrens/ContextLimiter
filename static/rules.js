/** @typedef {import('../src/lib/types').FilterRule} FilterRule */
/** @typedef {import('../src/lib/types').TabLimiterConfig} Config */
/** @typedef {import('../src/lib/types').WindowType} WindowType */

/** @param {string} pattern */
export function normalizeUrlPattern(pattern) {
	const value = pattern.trim();
	if (!value || value.includes('://') || value === '*') return value;
	return value.includes('/') || value.includes('.') ? '*://' + value + '/*' : value;
}

/** @param {string} pattern */
export function isValidUrlPattern(pattern) {
	const value = pattern.trim();
	return value.length > 0 && value.length <= 512 && !/[\r\n]/.test(value);
}

/** @param {string} value @param {string} pattern */
export function globMatches(value, pattern) {
	const expression = normalizeUrlPattern(pattern)
		.replace(/([.+^=!:{}()|[\]\\$])/g, '\\$1')
		.replace(/\*/g, '.*')
		.replace(/\?/g, '.');
	return new RegExp('^' + expression + '$', 'i').test(value);
}

/**
 * Each count uses the first enabled matching rule applicable to that count.
 * Website rules never affect window counts.
 * @param {string} url
 * @param {string | undefined} windowType
 * @param {'tabs' | 'windows'} scope
 * @param {FilterRule[]} rules
 * @param {'count' | 'ignore'} defaultAction
 * @returns {{action: 'count' | 'ignore', matchedRule?: FilterRule}}
 */
export function decideRuleAction(url, windowType, scope, rules, defaultAction) {
	for (const rule of rules) {
		if (rule.enabled === false) continue;
		if (rule.target === 'window') {
			if (rule.pattern !== windowType) continue;
			if (rule.scope !== 'both' && rule.scope !== scope) continue;
		} else {
			if (scope !== 'tabs' || !url || !globMatches(url, rule.pattern)) continue;
		}
		return { action: rule.action, matchedRule: rule };
	}
	return { action: scope === 'windows' ? 'count' : defaultAction };
}

/** @param {string} url @param {FilterRule[]} rules @param {'count' | 'ignore'} defaultAction */
export function decideUrlAction(url, rules, defaultAction) {
	return decideRuleAction(url, undefined, 'tabs', rules, defaultAction);
}

/**
 * Move legacy exclusions ahead of website rules to preserve their precedence.
 * Clear the old fields so disabling/removing the new rule cannot resurrect it.
 * @param {Config} config
 * @returns {Config}
 */
export function migrateWindowExclusions(config) {
	/** @type {Array<[WindowType, keyof Config, keyof Config]>} */
	const types = [
		['popup', 'excludePopupForTabs', 'excludePopupForWindows'],
		['devtools', 'excludeDevtoolsForTabs', 'excludeDevtoolsForWindows'],
		['panel', 'excludePanelForTabs', 'excludePanelForWindows'],
		['app', 'excludeAppForTabs', 'excludeAppForWindows'],
		['normal', 'excludedWindowTypesForTabs', 'excludedWindowTypesForWindows']
	];
	/** @type {FilterRule[]} */
	const migrated = [];
	for (const [type, tabFlag, windowFlag] of types) {
		const tabs = config.excludedWindowTypesForTabs.includes(type) || config[tabFlag] === true;
		const windows = config.excludedWindowTypesForWindows.includes(type) || config[windowFlag] === true;
		if (tabs || windows) migrated.push({
			target: 'window', pattern: type, action: 'ignore', enabled: true,
			scope: tabs && windows ? 'both' : tabs ? 'tabs' : 'windows'
		});
	}
	return {
		...config, filterRules: [...migrated, ...config.filterRules],
		excludedWindowTypesForTabs: [], excludedWindowTypesForWindows: [],
		excludePopupForTabs: false, excludeDevtoolsForTabs: false, excludePanelForTabs: false, excludeAppForTabs: false,
		excludePopupForWindows: false, excludeDevtoolsForWindows: false, excludePanelForWindows: false, excludeAppForWindows: false
	};
}

/** @param {unknown} rules @returns {rules is FilterRule[]} */
export function isValidRuleList(rules) {
	return Array.isArray(rules) && rules.every(rule =>
		rule && typeof rule.pattern === 'string' && isValidUrlPattern(rule.pattern) &&
		(rule.action === 'count' || rule.action === 'ignore') &&
		(rule.enabled === undefined || typeof rule.enabled === 'boolean') &&
		(rule.target === 'window'
			? ['normal', 'popup', 'devtools', 'panel', 'app'].includes(rule.pattern) &&
				['tabs', 'windows', 'both'].includes(rule.scope)
			: (rule.target === undefined || rule.target === 'website') && (rule.scope === undefined || rule.scope === 'tabs'))
	);
}

/** @typedef {{id?: number, windowId: number, url?: string, title?: string, active?: boolean}} Tab */
/** @typedef {{id?: number, type?: string}} BrowserWindow */

/**
 * @param {Tab[]} tabs
 * @param {BrowserWindow[]} windows
 * @param {Config} config
 */
export function countBrowserState(tabs, windows, config) {
	const types = new Map(windows.map(win => [win.id, win.type]));
	const countedTabs = tabs.filter(tab =>
		types.has(tab.windowId) &&
		decideRuleAction(tab.url || '', types.get(tab.windowId), 'tabs', config.filterRules, config.filterDefaultAction).action === 'count'
	);
	const countedWindows = windows.filter(win =>
		decideRuleAction('', win.type, 'windows', config.filterRules, config.filterDefaultAction).action === 'count'
	);
	return { countedTabs, countedWindows };
}

/**
 * The candidate is already present in Chrome's tab snapshot. Substitute its
 * latest URL for delayed onUpdated events instead of adding it a second time.
 * @param {Tab[]} tabs
 * @param {BrowserWindow[]} windows
 * @param {Config} config
 * @param {Tab} candidate
 */
export function candidateExceedsLimits(tabs, windows, config, candidate) {
	if (!config.enabled) return false;
	const win = windows.find(item => item.id === candidate.windowId);
	if (!win) return false;
	const snapshot = candidate.id === undefined ? tabs : tabs.map(tab =>
		tab.id === candidate.id ? { ...tab, url: candidate.url } : tab
	);
	const counts = countBrowserState(snapshot, windows, config);
	const countsAsTab = decideRuleAction(candidate.url || '', win.type, 'tabs', config.filterRules, config.filterDefaultAction).action === 'count';
	const countsAsWindow = counts.countedWindows.some(item => item.id === win.id);
	return (countsAsTab && (
		counts.countedTabs.length > config.maxTabs ||
		counts.countedTabs.filter(tab => tab.windowId === win.id).length > config.maxWindowTabs
	)) || (countsAsWindow && counts.countedWindows.length > config.maxWindows);
}
