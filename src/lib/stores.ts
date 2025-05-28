import { writable, derived } from 'svelte/store';
import type { TabLimiterConfig, TabCounts } from './types';
import { DEFAULT_CONFIG } from './types';
import { browser } from '$app/environment';

// Configuration store
export const config = writable<TabLimiterConfig>(DEFAULT_CONFIG);

// Tab counts store for real-time status
export const tabCounts = writable<TabCounts>({
  totalTabs: 0,
  totalWindows: 0,
  tabsByWindow: []
});

// Last updated timestamp
export const lastUpdated = writable<Date>(new Date());

// Connection to service worker
let serviceWorkerPort: chrome.runtime.Port | null = null;

// Initialize connection to service worker
function connectToServiceWorker() {
  if (!browser || !chrome?.runtime) return;

  try {
    serviceWorkerPort = chrome.runtime.connect({ name: 'popup' });

    serviceWorkerPort.onMessage.addListener((message) => {
      if (message.action === 'tabCountsUpdated') {
        tabCounts.set(message.data);
        lastUpdated.set(new Date());
      } else if (message.action === 'configUpdated') {
        // Make sure the UI checkboxes reflect the array values
        ensureWindowTypeCheckboxSync(message.data);
        config.update(current => {
          const keys = Object.keys(message.data) as (keyof TabLimiterConfig)[];
          let changed = false;
          for (const key of keys) {
            if (current[key] !== message.data[key]) {
              changed = true;
              break;
            }
          }
          return changed ? message.data : current;
        });
      }
    });

    serviceWorkerPort.onDisconnect.addListener(() => {
      console.log('Disconnected from service worker');
      serviceWorkerPort = null;
      // Try to reconnect after a short delay
      setTimeout(connectToServiceWorker, 1000);
    });

    console.log('Connected to service worker');
  } catch (error) {
    console.error('Error connecting to service worker:', error);
  }
}

// Helper function to ensure window type checkbox values are synced with arrays
function ensureWindowTypeCheckboxSync(configData: Partial<TabLimiterConfig>) {
  if (!configData) return;

  // For tab counting exclusions
  if (Array.isArray(configData.excludedWindowTypesForTabs)) {
    configData.excludePopupForTabs = configData.excludedWindowTypesForTabs.includes('popup');
    configData.excludeDevtoolsForTabs = configData.excludedWindowTypesForTabs.includes('devtools');
    configData.excludePanelForTabs = configData.excludedWindowTypesForTabs.includes('panel');
    configData.excludeAppForTabs = configData.excludedWindowTypesForTabs.includes('app');
  }

  // For window counting exclusions
  if (Array.isArray(configData.excludedWindowTypesForWindows)) {
    configData.excludePopupForWindows = configData.excludedWindowTypesForWindows.includes('popup');
    configData.excludeDevtoolsForWindows = configData.excludedWindowTypesForWindows.includes('devtools');
    configData.excludePanelForWindows = configData.excludedWindowTypesForWindows.includes('panel');
    configData.excludeAppForWindows = configData.excludedWindowTypesForWindows.includes('app');
  }
}

// Helper function to sync the window type exclusion checkboxes to arrays
export function syncWindowExclusions(currentConfig: TabLimiterConfig): TabLimiterConfig {
  const updatedConfig = { ...currentConfig };

  // For tab counting
  updatedConfig.excludedWindowTypesForTabs = [];
  if (updatedConfig.excludePopupForTabs) updatedConfig.excludedWindowTypesForTabs.push('popup');
  if (updatedConfig.excludeDevtoolsForTabs) updatedConfig.excludedWindowTypesForTabs.push('devtools');
  if (updatedConfig.excludePanelForTabs) updatedConfig.excludedWindowTypesForTabs.push('panel');
  if (updatedConfig.excludeAppForTabs) updatedConfig.excludedWindowTypesForTabs.push('app');

  // For window counting
  updatedConfig.excludedWindowTypesForWindows = [];
  if (updatedConfig.excludePopupForWindows) updatedConfig.excludedWindowTypesForWindows.push('popup');
  if (updatedConfig.excludeDevtoolsForWindows) updatedConfig.excludedWindowTypesForWindows.push('devtools');
  if (updatedConfig.excludePanelForWindows) updatedConfig.excludedWindowTypesForWindows.push('panel');
  if (updatedConfig.excludeAppForWindows) updatedConfig.excludedWindowTypesForWindows.push('app');

  return updatedConfig;
}

// Initialize connection when browser is available
if (browser) {
  connectToServiceWorker();
}

// Derived stores
export const isEnabled = derived(config, ($config) => $config.enabled);

export const filteredTabsDisplay = derived(
  [tabCounts, config],
  ([counts, cfg]) => `${counts.totalTabs}/${cfg.maxTabs}`
);

export const windowsDisplay = derived(
  [tabCounts, config],
  ([counts, cfg]) => `${counts.totalWindows}/${cfg.maxWindows}`
);

export const filterModeInfo = derived(
  config,
  (cfg) => {
    const modeText = cfg.filterMode === 'restrictlist'
      ? 'Including'
      : cfg.filterMode === 'unrestrictlist'
        ? 'Excluding'
        : cfg.filterMode === 'allowlist'
          ? 'Allow Only'
          : 'Block Specific';
    return `Filter Mode: ${modeText} ${cfg.filters.length} patterns`;
  }
);

// Configuration management functions
export function updateConfig(updates: Partial<TabLimiterConfig>) {
  if ('enabled' in updates) {
    console.log('[ContextLimiter] updateConfig called with enabled:', updates.enabled);
  }
  if (!browser || !chrome?.runtime) {
    config.update(current => {
      if ('enabled' in updates) {
        console.log('[ContextLimiter] Local config update (non-extension) enabled:', updates.enabled);
      }
      return { ...current, ...updates };
    });
    saveConfigToLocalStorage();
    return;
  }

  // Optimistically update the local store immediately
  config.update(current => {
    if ('enabled' in updates) {
      console.log('[ContextLimiter] Optimistic config update enabled:', updates.enabled);
    }
    return { ...current, ...updates };
  });

  chrome.runtime.sendMessage({
    action: 'updateConfig',
    config: updates
  }, (response) => {
    if (response?.success && response.config) {
      config.update(current => {
        const keys = Object.keys(updates) as (keyof TabLimiterConfig)[];
        let changed = false;
        for (const key of keys) {
          if (current[key] !== response.config[key]) {
            changed = true;
            break;
          }
        }
        if (changed && 'enabled' in response.config) {
          console.log('[ContextLimiter] Config updated from service worker, enabled:', response.config.enabled);
        }
        return changed ? response.config : current;
      });
    }
  });
}

export function resetConfig() {
  if (!browser || !chrome?.runtime) {
    // Fallback for non-extension environment
    config.set({ ...DEFAULT_CONFIG });
    saveConfigToLocalStorage();
    return;
  }

  chrome.runtime.sendMessage({
    action: 'updateConfig',
    reset: true
  }, (response) => {
    if (response?.success) {
      config.set(response.config);
    }
  });
}

function saveConfigToLocalStorage() {
  if (!browser) return;

  config.subscribe(value => {
    try {
      localStorage.setItem('contextLimiterConfig', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  })();
}

export function loadConfig() {
  if (!browser || !chrome?.runtime) {
    // Fallback for non-extension environment - use localStorage
    try {
      const stored = localStorage.getItem('contextLimiterConfig');
      if (stored) {
        const parsed = JSON.parse(stored);
        const newConfig = { ...DEFAULT_CONFIG, ...parsed };

        // Ensure window type checkbox values are synced with arrays
        ensureWindowTypeCheckboxSync(newConfig);

        config.set(newConfig);
      }
    } catch (error) {
      console.error('Error loading config from localStorage:', error);
    }
    return;
  }

  chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
    if (response?.config) {
      // Ensure window type checkbox values are synced with arrays
      ensureWindowTypeCheckboxSync(response.config);
      config.set(response.config);
    }
  });
}

export function getCurrentTabCounts() {
  if (!browser || !chrome?.runtime) {
    // Fallback for non-extension environment
    return Promise.resolve({
      totalTabs: 0,
      totalWindows: 0,
      tabsByWindow: []
    });
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getCurrentTabCounts' }, (response) => {
      resolve(response || {
        totalTabs: 0,
        totalWindows: 0,
        tabsByWindow: []
      });
    });
  });
}

// URL pattern validation
export function isValidUrlPattern(pattern: string): boolean {
  try {
    // Allow wildcards
    if (pattern.includes('*')) {
      return true;
    }

    // Allow URLs with protocols
    if (pattern.includes('://')) {
      return true;
    }

    // Allow basic domain patterns
    if (pattern.includes('.')) {
      return true;
    }

    // Allow simple domain names or paths
    if (/^[a-zA-Z0-9\-_\/]+$/.test(pattern)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// Initialize the store
loadConfig();

// Add a subscription for config changes to log enabled value
config.subscribe(cfg => {
  console.log('[ContextLimiter] config.subscribe: enabled =', cfg.enabled);
});
