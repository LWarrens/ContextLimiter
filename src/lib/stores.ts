import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { DEFAULT_CONFIG, type TabCounts, type TabLimiterConfig, type WindowType } from './types';
import { isValidUrlPattern } from './policy';

export type ConnectionState = 'loading' | 'ready' | 'disconnected' | 'error';
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const config = writable<TabLimiterConfig>({ ...DEFAULT_CONFIG });
export const tabCounts = writable<TabCounts>({ totalTabs: 0, totalWindows: 0, tabsByWindow: [] });
export const lastUpdated = writable<Date | null>(null);
export const connectionState = writable<ConnectionState>('loading');
export const saveState = writable<SaveState>('idle');
export const saveError = writable<string | null>(null);

let serviceWorkerPort: chrome.runtime.Port | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function extensionRuntime(): typeof chrome.runtime | null {
	return browser && typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime : null;
}

function normalizeConfig(value: Partial<TabLimiterConfig>): TabLimiterConfig {
	const next = { ...DEFAULT_CONFIG, ...value };
	const tabTypes = Array.isArray(value.excludedWindowTypesForTabs) ? value.excludedWindowTypesForTabs : [];
	const windowTypes = Array.isArray(value.excludedWindowTypesForWindows) ? value.excludedWindowTypesForWindows : [];
	return {
		...next,
		excludedWindowTypesForTabs: tabTypes,
		excludedWindowTypesForWindows: windowTypes,
		excludePopupForTabs: tabTypes.includes('popup'),
		excludeDevtoolsForTabs: tabTypes.includes('devtools'),
		excludePanelForTabs: tabTypes.includes('panel'),
		excludeAppForTabs: tabTypes.includes('app'),
		excludePopupForWindows: windowTypes.includes('popup'),
		excludeDevtoolsForWindows: windowTypes.includes('devtools'),
		excludePanelForWindows: windowTypes.includes('panel'),
		excludeAppForWindows: windowTypes.includes('app')
	};
}

export function syncWindowExclusions(current: TabLimiterConfig): TabLimiterConfig {
	const types: WindowType[] = ['popup', 'devtools', 'panel', 'app'];
	const excludedFor = (suffix: 'Tabs' | 'Windows') =>
		types.filter((type) => current[`exclude${type[0].toUpperCase()}${type.slice(1)}For${suffix}` as keyof TabLimiterConfig] === true);
	return normalizeConfig({
		...current,
		excludedWindowTypesForTabs: excludedFor('Tabs'),
		excludedWindowTypesForWindows: excludedFor('Windows')
	});
}

function scheduleReconnect() {
	if (reconnectTimer || !extensionRuntime()) return;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		connectToServiceWorker();
	}, 1_000);
}

function connectToServiceWorker() {
	const runtime = extensionRuntime();
	if (!runtime || serviceWorkerPort) return;
	try {
		serviceWorkerPort = runtime.connect({ name: 'popup' });
		connectionState.set('ready');
		serviceWorkerPort.onMessage.addListener((message) => {
			if (message.action === 'tabCountsUpdated') {
				tabCounts.set(message.data);
				lastUpdated.set(new Date());
			} else if (message.action === 'configUpdated') {
				config.set(normalizeConfig(message.data));
			}
		});
		serviceWorkerPort.onDisconnect.addListener(() => {
			serviceWorkerPort = null;
			connectionState.set('disconnected');
			scheduleReconnect();
		});
	} catch {
		connectionState.set('error');
		scheduleReconnect();
	}
}

async function sendMessage<T>(message: unknown): Promise<T> {
	const runtime = extensionRuntime();
	if (!runtime) throw new Error('The extension service worker is unavailable.');
	return new Promise<T>((resolve, reject) => {
		runtime.sendMessage(message, (response) => {
			const error = chrome.runtime.lastError;
			if (error) reject(new Error(error.message));
			else resolve(response as T);
		});
	});
}

export const isEnabled = derived(config, ($config) => $config.enabled);
export const filteredTabsDisplay = derived([tabCounts, config], ([counts, cfg]) => `${counts.totalTabs}/${cfg.maxTabs}`);
export const windowsDisplay = derived([tabCounts, config], ([counts, cfg]) => `${counts.totalWindows}/${cfg.maxWindows}`);

export async function updateConfig(updates: Partial<TabLimiterConfig>): Promise<boolean> {
	saveState.set('saving');
	saveError.set(null);
	try {
		const runtime = extensionRuntime();
		if (!runtime) {
			let next = { ...DEFAULT_CONFIG };
			config.update((current) => (next = normalizeConfig({ ...current, ...updates })));
			localStorage.setItem('contextLimiterConfig', JSON.stringify(next));
		} else {
			const response = await sendMessage<{ success?: boolean; config?: TabLimiterConfig; error?: string }>({ action: 'updateConfig', config: updates });
			if (!response?.success || !response.config) throw new Error(response?.error || 'Could not save settings.');
			config.set(normalizeConfig(response.config));
		}
		saveState.set('saved');
		return true;
	} catch (error) {
		saveError.set(error instanceof Error ? error.message : 'Could not save settings.');
		saveState.set('error');
		return false;
	}
}

export async function resetConfig(): Promise<boolean> {
	saveState.set('saving');
	try {
		const runtime = extensionRuntime();
		if (!runtime) return updateConfig(DEFAULT_CONFIG);
		const response = await sendMessage<{ success?: boolean; config?: TabLimiterConfig; error?: string }>({ action: 'updateConfig', reset: true });
		if (!response?.success || !response.config) throw new Error(response?.error || 'Could not reset settings.');
		config.set(normalizeConfig(response.config));
		saveState.set('saved');
		return true;
	} catch (error) {
		saveError.set(error instanceof Error ? error.message : 'Could not reset settings.');
		saveState.set('error');
		return false;
	}
}

export async function loadConfig() {
	connectionState.set('loading');
	try {
		const runtime = extensionRuntime();
		if (!runtime) {
			const stored = localStorage.getItem('contextLimiterConfig');
			if (stored) config.set(normalizeConfig(JSON.parse(stored)));
		} else {
			const response = await sendMessage<{ config?: TabLimiterConfig }>({ action: 'getConfig' });
			if (response?.config) config.set(normalizeConfig(response.config));
			connectToServiceWorker();
		}
		connectionState.set('ready');
	} catch {
		connectionState.set('error');
	}
}

export function getCurrentTabCounts() {
	return sendMessage<TabCounts>({ action: 'getCurrentTabCounts' });
}

export { isValidUrlPattern };

void loadConfig();
