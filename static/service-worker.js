import { decideRuleAction, migrateWindowExclusions, isValidRuleList, countBrowserState, candidateExceedsLimits } from './rules.js';

// Context Limiter service worker
// This script manages tab limits based on filters and window counts

// Default configuration
const DEFAULT_CONFIG = {
  enabled: true,
  maxTabs: 200,
  maxWindowTabs: 20,
  maxWindows: 20,
  filterDefaultAction: 'ignore',
  filterRules: [],
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

// Toolbar alert state for enforced close actions
let enforcementBlinkInterval = null;
let enforcementBlinkTimeout = null;
let enforcementBlinkVisible = false;
let actionIconFramesPromise = null;

// Cache compiled glob regexes to avoid recompiling on every tab check


// Enhanced configuration loading with validation
function loadConfig() {
  return new Promise((resolve) => chrome.storage.sync.get('tabLimiterConfig', (result) => {
    if (chrome.runtime.lastError) {
      console.error('Could not load configuration:', chrome.runtime.lastError.message);
      resolve();
      return;
    }
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

      // Rule-based policy fields
      if (result.tabLimiterConfig.filterDefaultAction === 'count' || result.tabLimiterConfig.filterDefaultAction === 'ignore') {
        config.filterDefaultAction = result.tabLimiterConfig.filterDefaultAction;
      }

      if (Array.isArray(result.tabLimiterConfig.filterRules)) {
        config.filterRules = result.tabLimiterConfig.filterRules;

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
      config = migrateWindowExclusions(config);

      console.log('Loaded and validated config:', config);
    } else {
      // Initialize with defaults if no configuration exists
      saveConfig(() => {});
    }
    resolve();
  }));
}

// Save configuration to storage
function saveConfig(callback) {
  chrome.storage.sync.set({ 'tabLimiterConfig': config }, () => {
    if (chrome.runtime.lastError) {
      const error = chrome.runtime.lastError.message;
      console.error('Could not save configuration:', error);
      if (callback) callback(error);
      return;
    }
    console.log('Saved config:', config);
    if (callback) callback(null);
  });
}



async function getActionIconFrames() {
  if (actionIconFramesPromise) {
    return actionIconFramesPromise;
  }

  actionIconFramesPromise = (async () => {
    const response = await fetch(chrome.runtime.getURL('favicon.png'));
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const width = bitmap.width || 32;
    const height = bitmap.height || 32;

    const normalCanvas = new OffscreenCanvas(width, height);
    const normalContext = normalCanvas.getContext('2d', { willReadFrequently: true });
    if (!normalContext) {
      throw new Error('Could not create 2d context for normal icon frame');
    }

    normalContext.clearRect(0, 0, width, height);
    normalContext.drawImage(bitmap, 0, 0, width, height);
    const normalImageData = normalContext.getImageData(0, 0, width, height);

    const alertCanvas = new OffscreenCanvas(width, height);
    const alertContext = alertCanvas.getContext('2d', { willReadFrequently: true });
    if (!alertContext) {
      throw new Error('Could not create 2d context for alert icon frame');
    }

    alertContext.clearRect(0, 0, width, height);
    alertContext.drawImage(bitmap, 0, 0, width, height);
    const alertImageData = alertContext.getImageData(0, 0, width, height);
    const pixels = alertImageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3];
      if (alpha === 0) continue;

      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      const luminance = (red + green + blue) / 3;

      pixels[i] = Math.min(255, 180 + luminance * 0.35);
      pixels[i + 1] = Math.max(0, luminance * 0.2);
      pixels[i + 2] = Math.max(0, luminance * 0.2);
    }

    return {
      normal: normalImageData,
      alert: alertImageData
    };
  })().catch((error) => {
    actionIconFramesPromise = null;
    throw error;
  });

  return actionIconFramesPromise;
}

async function setActionIconVisible(visible) {
  try {
    const frames = await getActionIconFrames();
    await chrome.action.setIcon({
      imageData: visible ? frames.alert : frames.normal
    });
  } catch (error) {
    console.error('[ContextLimiter] Failed to update action icon:', error);
  }
}

function setEnforcementBlinkVisible(visible) {
  enforcementBlinkVisible = visible;
  void setActionIconVisible(visible);

  chrome.action.setBadgeText({ text: visible ? '!' : '' }).catch((error) => {
    console.error('[ContextLimiter] Failed to update action badge text:', error);
  });

  if (visible) {
    chrome.action.setBadgeBackgroundColor({ color: '#ff2d2d' }).catch((error) => {
      console.error('[ContextLimiter] Failed to update action badge background:', error);
    });

    if (chrome.action.setBadgeTextColor) {
      chrome.action.setBadgeTextColor({ color: '#ffffff' }).catch((error) => {
        console.error('[ContextLimiter] Failed to update action badge text color:', error);
      });
    }
  }
}

function startEnforcementBlink(reason = 'limit enforced') {
  console.log(`[ContextLimiter] Starting action blink: ${reason}`);

  if (enforcementBlinkInterval) {
    clearInterval(enforcementBlinkInterval);
    enforcementBlinkInterval = null;
  }

  if (enforcementBlinkTimeout) {
    clearTimeout(enforcementBlinkTimeout);
    enforcementBlinkTimeout = null;
  }

  setEnforcementBlinkVisible(true);

  enforcementBlinkInterval = setInterval(() => {
    setEnforcementBlinkVisible(!enforcementBlinkVisible);
  }, 350);

  enforcementBlinkTimeout = setTimeout(() => {
    if (enforcementBlinkInterval) {
      clearInterval(enforcementBlinkInterval);
      enforcementBlinkInterval = null;
    }

    setEnforcementBlinkVisible(false);
    enforcementBlinkTimeout = null;
  }, 3000);
}

// Function to get current tab counts with filtering and active tab titles
async function getCurrentTabCounts() {
  await configReady;
  try {
    const [tabs, allWindows] = await Promise.all([
      chrome.tabs.query({}),
      chrome.windows.getAll()
    ]);

    console.log(`Retrieved ${tabs.length} tabs and ${allWindows.length} windows`);

    const { countedTabs, countedWindows } = countBrowserState(tabs, allWindows, config);

    // Create a detailed response with window info (show all windows but indicate which are excluded)
    const tabsByWindow = allWindows.map(win => {
      const isCountedForTabs = decideRuleAction('', win.type, 'tabs', config.filterRules.filter(rule => rule.target === 'window'), 'count').action === 'count';
      const isCountedForWindows = countedWindows.some(w => w.id === win.id);

      const windowTabs = tabs.filter(tab => tab.windowId === win.id);
      const countedWindowTabs = countedTabs.filter(tab => tab.windowId === win.id);

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
      totalWindows: countedWindows.length,
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

// Apply the same scoped rules used by the popup to every enforcement decision.
async function wouldExceedLimits(newTabUrl, windowId, tabId) {
  await configReady;
  if (!config.enabled) return false;
  try {
    const [tabs, windows] = await Promise.all([chrome.tabs.query({}), chrome.windows.getAll()]);
    return candidateExceedsLimits(tabs, windows, config, { id: tabId, windowId, url: newTabUrl });
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
  await configReady;
  if (tab.id) {
    // Add this tab to our new tabs tracker
    newTabsTracker.add(tab.id);
    console.log(`Tab ${tab.id} created - tracking as new tab`);

    // Check if this tab creation would exceed limits
    if (config.enabled && await wouldExceedLimits(tab.url || 'about:blank', tab.windowId, tab.id)) {
      console.log(`Closing tab ${tab.id} due to limit exceeded`);
      try {
        await chrome.tabs.remove(tab.id);
        startEnforcementBlink('tab closed on creation');
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

    // Re-check limits when a newly created tab receives its real URL.
    if (config.enabled && newTabsTracker.has(tabId) && changeInfo.url !== undefined && tab?.windowId) {
      configReady.then(() => wouldExceedLimits(tab.url || changeInfo.url || 'about:blank', tab.windowId, tabId))
        .then(async (shouldClose) => {
          if (!shouldClose) return;
          try {
            await chrome.tabs.remove(tabId);
            newTabsTracker.delete(tabId);
            startEnforcementBlink('tab closed after url update');
            console.log(`Closed tab ${tabId} after URL update due to limits`);
          } catch (error) {
            console.error(`Failed to close tab ${tabId} after URL update:`, error);
          }
        })
        .catch((error) => {
          console.error(`Error re-checking limits for tab ${tabId}:`, error);
        });
    }

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
    configReady.then(() => sendResponse({ config }));
    return true;
  }
  if (request.action === 'updateConfig') {
    configReady.then(() => {
    if (request.config?.filterRules !== undefined && !isValidRuleList(request.config.filterRules)) {
      sendResponse({ success: false, error: 'Invalid rule: check its target, action, and scope.' });
      return;
    }
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
      if (request.config.filterDefaultAction === 'count' || request.config.filterDefaultAction === 'ignore') {
        config.filterDefaultAction = request.config.filterDefaultAction;
      }
      if (Array.isArray(request.config.filterRules)) {
        config.filterRules = request.config.filterRules;

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
    saveConfig((error) => {
      if (error) {
        sendResponse({ success: false, error });
        return;
      }
      sendResponse({ success: true, config });
      broadcastTabCounts();
      broadcastConfigUpdate();
    });
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
  configReady.then(() => getCurrentTabCounts()).then(tabCounts => {
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

// Initialize once. Extension workers can restart at any time, so event paths
// wait for this promise before serving or enforcing configuration.
const configReady = loadConfig();

console.log('Context Limiter service worker initialized');
