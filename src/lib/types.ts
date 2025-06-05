// Type definitions for Context Limiter

export interface TabLimiterConfig {
  enabled: boolean;
  maxTabs: number;
  maxWindowTabs: number;
  maxWindows: number;
  filterMode: 'restrictlist' | 'unrestrictlist' | 'allowlist' | 'denylist';
  filters: string[];
  // Window type exclusions for tab counting
  excludedWindowTypesForTabs: WindowType[];
  // Window type exclusions for window counting  
  excludedWindowTypesForWindows: WindowType[];
  // Individual exclusion flags for easier UI binding
  excludePopupForTabs: boolean;
  excludeDevtoolsForTabs: boolean;
  excludePanelForTabs: boolean;
  excludeAppForTabs: boolean;
  excludePopupForWindows: boolean;
  excludeDevtoolsForWindows: boolean;
  excludePanelForWindows: boolean;
  excludeAppForWindows: boolean;
}

export interface TabCounts {
  totalTabs: number;
  totalWindows: number;
  tabsByWindow: Array<{
    windowId: number;
    tabCount: number;
    activeTabTitle: string;
  }>;
}

export type WindowType = 'normal' | 'popup' | 'panel' | 'app' | 'devtools';

export const DEFAULT_CONFIG: TabLimiterConfig = {
  enabled: true,
  maxTabs: 200,
  maxWindowTabs: 20,
  maxWindows: 20,
  filterMode: 'restrictlist',
  filters: [],
  excludedWindowTypesForTabs: [],
  excludedWindowTypesForWindows: [],
  excludePopupForTabs: false,
  excludeDevtoolsForTabs: false,
  excludePanelForTabs: false,
  excludeAppForTabs: false,
  excludePopupForWindows: false,
  excludeDevtoolsForWindows: false,
  excludePanelForWindows: false,
  excludeAppForWindows: false
};
