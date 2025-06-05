// Context Limiter service worker
// This script manages tab limits based on filters and window counts

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  maxTabs: 200,
  maxWindowTabs: 20,
  maxWindows: 20,
  filterMode: 'restrictlist', // 'restrictlist' or 'unrestrictlist'
  filters: [],
  // Window type exclusions for tab counting
  excludedWindowTypesForTabs: [],
  // Window type exclusions for window counting  
  excludedWindowTypesForWindows: [],
  // Individual exclusion flags for UI binding
  excludePopupForTabs: false,
  excludeDevtoolsForTabs: false,
  excludePanelForTabs: false,
  excludeAppForTabs: false,
  excludePopupForWindows: false,
  excludeDevtoolsForWindows: false,
  excludePanelForWindows: false,
  excludeAppForWindows: false
};

// Store for our configuration
let config = { ...DEFAULT_CONFIG };

// Track newly created tabs
const newTabsTracker = new Set();

// Keep track of connected clients (popup, settings)
const connectedClients = new Set();

// Enhanced configuration loading with validation
function loadConfig() {
  chrome.storage.sync.get('tabLimiterConfig', (result) => {
    if (result.tabLimiterConfig) {
      // First create a clean config with all defaults
      config = { ...DEFAULT_CONFIG };

      // Only apply values from storage that are valid
      if (typeof result.tabLimiterConfig.enabled === 'boolean') {
        config.enabled = result.tabLimiterConfig.enabled;
      }

      // Validate numeric values
      if (Number.isInteger(result.tabLimiterConfig.maxTabs) && result.tabLimiterConfig.maxTabs > 0) {
        config.maxTabs = result.tabLimiterConfig.maxTabs;
      }

      if (Number.isInteger(result.tabLimiterConfig.maxWindowTabs) && result.tabLimiterConfig.maxWindowTabs > 0) {
        config.maxWindowTabs = result.tabLimiterConfig.maxWindowTabs;
      }

      if (Number.isInteger(result.tabLimiterConfig.maxWindows) && result.tabLimiterConfig.maxWindows > 0) {
        config.maxWindows = result.tabLimiterConfig.maxWindows;
      }

      // Filter mode must be one of the valid options
      if (result.tabLimiterConfig.filterMode === 'restrictlist' || result.tabLimiterConfig.filterMode === 'unrestrictlist') {
        config.filterMode = result.tabLimiterConfig.filterMode;
      }
      // Support legacy values for backward compatibility
      if (result.tabLimiterConfig.filterMode === 'denylist') {
        config.filterMode = 'restrictlist';
      }
      if (result.tabLimiterConfig.filterMode === 'allowlist') {
        config.filterMode = 'unrestrictlist';
      }

      // Filters should be an array
      if (Array.isArray(result.tabLimiterConfig.filters)) {
        config.filters = result.tabLimiterConfig.filters;
      }

      // Handle window type exclusions arrays
      if (Array.isArray(result.tabLimiterConfig.excludedWindowTypesForTabs)) {
        config.excludedWindowTypesForTabs = result.tabLimiterConfig.excludedWindowTypesForTabs;
      }

      if (Array.isArray(result.tabLimiterConfig.excludedWindowTypesForWindows)) {
        config.excludedWindowTypesForWindows = result.tabLimiterConfig.excludedWindowTypesForWindows;
      }

      // Handle individual window type exclusion flags for UI binding
      // For tab counting
      if (typeof result.tabLimiterConfig.excludePopupForTabs === 'boolean') {
        config.excludePopupForTabs = result.tabLimiterConfig.excludePopupForTabs;
      }
      if (typeof result.tabLimiterConfig.excludeDevtoolsForTabs === 'boolean') {
        config.excludeDevtoolsForTabs = result.tabLimiterConfig.excludeDevtoolsForTabs;
      }
      if (typeof result.tabLimiterConfig.excludePanelForTabs === 'boolean') {
        config.excludePanelForTabs = result.tabLimiterConfig.excludePanelForTabs;
      }
      if (typeof result.tabLimiterConfig.excludeAppForTabs === 'boolean') {
        config.excludeAppForTabs = result.tabLimiterConfig.excludeAppForTabs;
      }

      // For window counting
      if (typeof result.tabLimiterConfig.excludePopupForWindows === 'boolean') {
        config.excludePopupForWindows = result.tabLimiterConfig.excludePopupForWindows;
      }
      if (typeof result.tabLimiterConfig.excludeDevtoolsForWindows === 'boolean') {
        config.excludeDevtoolsForWindows = result.tabLimiterConfig.excludeDevtoolsForWindows;
      }
      if (typeof result.tabLimiterConfig.excludePanelForWindows === 'boolean') {
        config.excludePanelForWindows = result.tabLimiterConfig.excludePanelForWindows;
      }
      if (typeof result.tabLimiterConfig.excludeAppForWindows === 'boolean') {
        config.excludeAppForWindows = result.tabLimiterConfig.excludeAppForWindows;
      }

      // Ensure arrays and flags are in sync (flags take precedence)
      syncWindowExclusionSettings();

      console.log('Loaded and validated config:', config);
    } else {
      // Initialize with defaults if no configuration exists
      saveConfig();
    }
  });
}

// Sync individual exclusion flags with the arrays
function syncWindowExclusionSettings() {
  // Sync the tabs exclusion settings
  updateExclusionArray('excludedWindowTypesForTabs', [
    { type: 'popup', flag: 'excludePopupForTabs' },
    { type: 'devtools', flag: 'excludeDevtoolsForTabs' },
    { type: 'panel', flag: 'excludePanelForTabs' },
    { type: 'app', flag: 'excludeAppForTabs' }
  ]);

  // Sync the windows exclusion settings
  updateExclusionArray('excludedWindowTypesForWindows', [
    { type: 'popup', flag: 'excludePopupForWindows' },
    { type: 'devtools', flag: 'excludeDevtoolsForWindows' },
    { type: 'panel', flag: 'excludePanelForWindows' },
    { type: 'app', flag: 'excludeAppForWindows' }
  ]);
}

// Helper function to update exclusion arrays based on flags
function updateExclusionArray(arrayKey, mappings) {
  // Start with an empty array
  const newArray = [];

  // Add types that have their flags set to true
  mappings.forEach(mapping => {
    if (config[mapping.flag]) {
      newArray.push(mapping.type);
    }
  });

  // Update the array in the config
  config[arrayKey] = newArray;
}

// Save configuration to storage
function saveConfig(callback) {
  chrome.storage.sync.set({ 'tabLimiterConfig': config }, () => {
    console.log('Saved config:', config);
    if (callback) callback();
  });
}

// Glob matching function: supports *, ?, and escapes. Case-insensitive.
function globMatch(str, pattern) {
  // Escape regex special chars except * and ?
  let regexStr = pattern.replace(/([.+^=!:${}()|\[\]\\])/g, '\\$1')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  // Anchor to start/end
  regexStr = '^' + regexStr + '$';
  try {
    return new RegExp(regexStr, 'i').test(str);
  } catch (e) {
    console.error('[ContextLimiter] Invalid glob pattern:', pattern, e);
    return false;
  }
}

// Check if a URL matches any filter in the list using glob-based matching
function urlMatchesFilters(url, filters) {
  if (!filters || filters.length === 0) return false;
  return filters.some(pattern => {
    pattern = pattern.trim();
    if (!pattern) return false;
    // Log for debugging
    // console.log('[ContextLimiter] Matching URL', url, 'against glob', pattern);
    return globMatch(url, pattern);
  });
}

// Function to get current tab counts with filtering and active tab titles
async function getCurrentTabCounts() {
  try {
    const [tabs, allWindows] = await Promise.all([
      chrome.tabs.query({}),
      chrome.windows.getAll()
    ]);

    console.log(`Retrieved ${tabs.length} tabs and ${allWindows.length} windows`);

    // Filter windows for tab counting (excludes certain window types from tab limits)
    const windowsForTabCounting = filterWindowsForTabCounting(allWindows);

    // Filter windows for window counting (excludes certain window types from window limits)
    const windowsForWindowCounting = filterWindowsForWindowCounting(allWindows);

    // Only count tabs from windows that are included in tab counting
    const tabsFromCountedWindows = tabs.filter(tab =>
      windowsForTabCounting.some(window => window.id === tab.windowId)
    );

    // Use the common function to count tabs from counted windows
    const countedTabs = filterCountedTabs(tabsFromCountedWindows);

    // Create a detailed response with window info (show all windows but indicate which are excluded)
    const tabsByWindow = allWindows.map(win => {
      const isCountedForTabs = windowsForTabCounting.some(w => w.id === win.id);
      const isCountedForWindows = windowsForWindowCounting.some(w => w.id === win.id);

      const windowTabs = tabs.filter(tab => tab.windowId === win.id);
      const countedWindowTabs = isCountedForTabs ? filterCountedTabs(windowTabs) : [];

      // Find the active tab in this window
      const activeTab = windowTabs.find(tab => tab.active);
      const activeTabUrl = activeTab?.url || 'No active tab';
      let activeTabTitle = activeTab?.title || 'Untitled Tab';

      // Handle special cases for browser internal pages
      if (activeTabUrl.startsWith('chrome://') || activeTabUrl.startsWith('brave://') || activeTabUrl.startsWith('edge://')) {
        activeTabTitle = activeTabTitle || 'Browser Page';
      } else if (activeTabUrl === 'chrome://newtab/' || activeTabUrl.includes('newtab')) {
        activeTabTitle = 'New Tab';
      } else if (!activeTabTitle || activeTabTitle.trim() === '') {
        activeTabTitle = 'Loading...';
      }

      console.log(`Window ${win.id} (${win.type}) - Active tab: "${activeTabTitle}" (${activeTabUrl}), Count: ${countedWindowTabs.length}, Counted for tabs: ${isCountedForTabs}, Counted for windows: ${isCountedForWindows}`);

      return {
        windowId: win.id,
        windowType: win.type,
        tabCount: countedWindowTabs.length,
        activeTabUrl: activeTabUrl,
        activeTabTitle: activeTabTitle,
        isCountedForTabs: isCountedForTabs,
        isCountedForWindows: isCountedForWindows
      };
    });

    console.log('Final window data being sent to popup:', tabsByWindow);

    return {
      totalTabs: countedTabs.length,
      totalWindows: windowsForWindowCounting.length,
      tabsByWindow: tabsByWindow
    };
  } catch (err) {
    console.error('Error getting tab counts:', err);
    return {
      totalTabs: 0,
      totalWindows: 0,
      tabsByWindow: [],
      error: err.message
    };
  }
}

// Broadcast tab counts to all connected clients
async function broadcastTabCounts() {
  if (connectedClients.size === 0) return; // No clients connected

  const tabCounts = await getCurrentTabCounts();

  // Broadcast to all connected clients
  for (const port of connectedClients) {
    try {
      port.postMessage({
        action: 'tabCountsUpdated',
        data: tabCounts
      });
    } catch (e) {
      console.error('Error sending tab counts update:', e);
      // Remove dead connections
      connectedClients.delete(port);
    }
  }
}

// Broadcast configuration updates to all connected clients
function broadcastConfigUpdate() {
  if (connectedClients.size === 0) return; // No clients connected

  console.log('Broadcasting config update to connected clients:', config);

  // Broadcast to all connected clients
  for (const port of connectedClients) {
    try {
      port.postMessage({
        action: 'configUpdated',
        data: config
      });
    } catch (e) {
      console.error('Error sending config update:', e);
      // Remove dead connections
      connectedClients.delete(port);
    }
  }
}

// Create a common function for filtering tabs to reduce code duplication
function filterCountedTabs(tabs) {
  return tabs.filter(t => {
    if (!t.url) return false;
    const tabUrlMatches = urlMatchesFilters(t.url, config.filters);

    // restrictlist: only count tabs that match filters (restrict/limit these specific tabs)
    // unrestrictlist: count all tabs except those that match filters (unrestrict/don't limit these specific tabs)
    return config.filterMode === 'restrictlist' ? tabUrlMatches : !tabUrlMatches;
  });
}

// Filter windows by type for tab counting purposes
function filterWindowsForTabCounting(windows) {
  if (!config.excludedWindowTypesForTabs || config.excludedWindowTypesForTabs.length === 0) {
    return windows;
  }

  return windows.filter(window => {
    return !config.excludedWindowTypesForTabs.includes(window.type);
  });
}

// Filter windows by type for window counting purposes  
function filterWindowsForWindowCounting(windows) {
  if (!config.excludedWindowTypesForWindows || config.excludedWindowTypesForWindows.length === 0) {
    return windows;
  }

  return windows.filter(window => {
    return !config.excludedWindowTypesForWindows.includes(window.type);
  });
}

// Check if creating a new tab would exceed limits
async function wouldExceedLimits(newTabUrl, windowId) {
  if (!config.enabled) return false;

  // If filtering is effectively disabled, never enforce limits
  if (!Array.isArray(config.filters) || config.filters.length === 0 ||
    (config.filterMode !== 'restrictlist' && config.filterMode !== 'unrestrictlist')) {
    return false;
  }

  try {
    const [tabs, allWindows] = await Promise.all([
      chrome.tabs.query({}),
      chrome.windows.getAll()
    ]);

    // Filter windows for tab counting (excludes certain window types from tab limits)
    const windowsForTabCounting = filterWindowsForTabCounting(allWindows);

    // Filter windows for window counting (excludes certain window types from window limits)
    const windowsForWindowCounting = filterWindowsForWindowCounting(allWindows);

    // Only count tabs from windows that are included in tab counting
    const tabsFromCountedWindows = tabs.filter(tab =>
      windowsForTabCounting.some(window => window.id === tab.windowId)
    );

    // Check total tabs limit (only from counted windows)
    const countedTabs = filterCountedTabs(tabsFromCountedWindows);
    if (countedTabs.length > config.maxTabs) {
      console.log(`Would exceed total tabs limit: ${countedTabs.length}/${config.maxTabs}`);
      return true;
    }

    // Check windows limit (only count windows that are included in window counting)
    if (windowsForWindowCounting.length > config.maxWindows) {
      console.log(`Would exceed windows limit: ${windowsForWindowCounting.length}/${config.maxWindows}`);
      return true;
    }

    // Check per-window tabs limit
    if (windowId) {
      // First check if this window is even counted for tab limiting
      const targetWindow = allWindows.find(w => w.id === windowId);
      const isWindowCountedForTabs = windowsForTabCounting.some(w => w.id === windowId);

      if (!isWindowCountedForTabs) {
        console.log(`Window ${windowId} (${targetWindow?.type}) is excluded from tab counting`);
        return false; // Don't limit tabs in excluded window types
      }

      const windowTabs = tabs.filter(tab => tab.windowId === windowId);
      const countedWindowTabs = filterCountedTabs(windowTabs);
      // Check if the new tab would be counted toward limits
      const mockTab = { url: newTabUrl };
      const newTabWouldBeCounted = filterCountedTabs([mockTab]).length > 0;

      if (newTabWouldBeCounted && countedWindowTabs.length > config.maxWindowTabs) {
        console.log(`Would exceed window tabs limit: ${countedWindowTabs.length}/${config.maxWindowTabs} in window ${windowId} (${targetWindow?.type})`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking limits:', error);
    return false;
  }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Use the centralized handler for tab state changes
  processTabStateChange(tabId, changeInfo, tab);
});

// Track newly created tabs
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id) {
    // Add this tab to our new tabs tracker
    newTabsTracker.add(tab.id);
    console.log(`Tab ${tab.id} created - tracking as new tab`);

    // Check if this tab creation would exceed limits
    if (config.enabled && await wouldExceedLimits(tab.url || 'about:blank', tab.windowId)) {
      console.log(`Closing tab ${tab.id} due to limit exceeded`);
      try {
        await chrome.tabs.remove(tab.id);
        // Show notification or could send message to popup if it's open
        console.log(`Tab ${tab.id} was closed due to tab limits`);
        return; // Don't continue with normal processing
      } catch (error) {
        console.error(`Failed to close tab ${tab.id}:`, error);
      }
    }

    // Schedule removal after a delay to handle initial tab loading
    setTimeout(() => {
      if (newTabsTracker.has(tab.id)) {
        console.log(`Tab ${tab.id} is no longer considered new`);
        newTabsTracker.delete(tab.id);
      }
    }, 10000); // 10 seconds should be enough for initial tab loading
  }

  // Broadcast updated tab counts
  broadcastTabCounts();
});

// Clean up closed tabs from our tracker
chrome.tabs.onRemoved.addListener((tabId) => {
  if (newTabsTracker.has(tabId)) {
    console.log(`Tab ${tabId} closed - removing from new tabs tracker`);
    newTabsTracker.delete(tabId);
  }

  // Broadcast updated tab counts
  broadcastTabCounts();
});

// Handle tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`Tab ${activeInfo.tabId} activated in window ${activeInfo.windowId}`);
  // Update UI when user switches tabs
  broadcastTabCounts();
});

// Handle tab attachment (moving tab to a different window)
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  console.log(`Tab ${tabId} attached to window ${attachInfo.newWindowId}`);
  // Update UI when tab is moved to a different window
  broadcastTabCounts();
});

// Handle tab detachment (removing tab from a window)
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  console.log(`Tab ${tabId} detached from window ${detachInfo.oldWindowId}`);
  // Update UI when tab is detached from a window
  broadcastTabCounts();
});

// Process tab state changes that should trigger UI updates
function processTabStateChange(tabId, changeInfo, tab) {
  // Only update for significant changes
  const significantChange = changeInfo.status === 'complete' ||
    changeInfo.title !== undefined ||
    changeInfo.url !== undefined;

  if (significantChange) {
    console.log(`Tab ${tabId} state changed:`, changeInfo);

    // Clean up tracker for tabs that no longer exist
    chrome.tabs.get(tabId).catch(() => {
      if (newTabsTracker.has(tabId)) {
        console.log(`Tab ${tabId} doesn't exist anymore - cleaning up from tracker`);
        newTabsTracker.delete(tabId);
      }
    });

    // Then update the UI
    setTimeout(broadcastTabCounts, 100);
  }
}

// Listen for messages from popup or settings page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    sendResponse({ config });
    return;
  }
  if (request.action === 'updateConfig') {
    // Handle reset flag for explicit reset operations
    if (request.reset === true) {
      console.log('Resetting configuration to defaults');
      config = { ...DEFAULT_CONFIG };
    } else {
      // Handle enabled flag
      if (typeof request.config.enabled === 'boolean') {
        config.enabled = request.config.enabled;
      }
      // Handle numeric values with validation
      if (request.config.maxTabs !== undefined) {
        const maxTabs = parseInt(request.config.maxTabs);
        if (!isNaN(maxTabs) && maxTabs > 0) {
          config.maxTabs = maxTabs;
        }
      }
      if (request.config.maxWindowTabs !== undefined) {
        const maxWindowTabs = parseInt(request.config.maxWindowTabs);
        if (!isNaN(maxWindowTabs) && maxWindowTabs > 0) {
          config.maxWindowTabs = maxWindowTabs;
        }
      }
      if (request.config.maxWindows !== undefined) {
        const maxWindows = parseInt(request.config.maxWindows);
        if (!isNaN(maxWindows) && maxWindows > 0) {
          config.maxWindows = maxWindows;
        }
      }
      // Handle filter mode
      if (request.config.filterMode === 'restrictlist' || request.config.filterMode === 'unrestrictlist') {
        config.filterMode = request.config.filterMode;
      }
      // Handle filters array
      if (Array.isArray(request.config.filters)) {
        config.filters = request.config.filters;
      }
      // Handle window type exclusions arrays
      if (Array.isArray(request.config.excludedWindowTypesForTabs)) {
        config.excludedWindowTypesForTabs = request.config.excludedWindowTypesForTabs;
      }
      if (Array.isArray(request.config.excludedWindowTypesForWindows)) {
        config.excludedWindowTypesForWindows = request.config.excludedWindowTypesForWindows;
      }
      // Handle individual window type exclusion flags
      if (typeof request.config.excludePopupForTabs === 'boolean') {
        config.excludePopupForTabs = request.config.excludePopupForTabs;
      }
      if (typeof request.config.excludeDevtoolsForTabs === 'boolean') {
        config.excludeDevtoolsForTabs = request.config.excludeDevtoolsForTabs;
      }
      if (typeof request.config.excludePanelForTabs === 'boolean') {
        config.excludePanelForTabs = request.config.excludePanelForTabs;
      }
      if (typeof request.config.excludeAppForTabs === 'boolean') {
        config.excludeAppForTabs = request.config.excludeAppForTabs;
      }
      if (typeof request.config.excludePopupForWindows === 'boolean') {
        config.excludePopupForWindows = request.config.excludePopupForWindows;
      }
      if (typeof request.config.excludeDevtoolsForWindows === 'boolean') {
        config.excludeDevtoolsForWindows = request.config.excludeDevtoolsForWindows;
      }
      if (typeof request.config.excludePanelForWindows === 'boolean') {
        config.excludePanelForWindows = request.config.excludePanelForWindows;
      }
      if (typeof request.config.excludeAppForWindows === 'boolean') {
        config.excludeAppForWindows = request.config.excludeAppForWindows;
      }
      // Make sure everything is in sync
      syncWindowExclusionSettings();
    }
    // Save the updated configuration and only respond after saving
    saveConfig(() => {
      sendResponse({ success: true, config });
      broadcastTabCounts();
      broadcastConfigUpdate();
    });
    return true; // Required for async response
  }
  if (request.action === 'getCurrentTabCounts') {
    getCurrentTabCounts().then(tabCounts => {
      sendResponse(tabCounts);
    }).catch(err => {
      console.error('Error getting tab counts:', err);
      sendResponse({ error: err.message });
    });
    return true; // Required for async response
  }
});

// Handle long-lived connections from popup and settings pages
chrome.runtime.onConnect.addListener((port) => {
  console.log(`Client connected: ${port.name}`);

  // Add this connection to our tracker
  connectedClients.add(port);

  // Send initial config and tab counts
  getCurrentTabCounts().then(tabCounts => {
    port.postMessage({
      action: 'tabCountsUpdated',
      data: tabCounts
    });
    port.postMessage({
      action: 'configUpdated',
      data: config
    });
  });

  // Listen for disconnect
  port.onDisconnect.addListener(() => {
    connectedClients.delete(port);
    console.log(`Client disconnected: ${port.name}, remaining clients: ${connectedClients.size}`);
  });
});

// Initialize
loadConfig();

console.log('Context Limiter service worker initialized');
