// Type definitions for Context Limiter

export type FilterAction = 'count' | 'ignore';

export interface FilterRule {
  pattern: string;
  action: FilterAction;
  enabled?: boolean;
}

export interface TabLimiterConfig {
  enabled: boolean;
  maxTabs: number;
  maxWindowTabs: number;
  maxWindows: number;
  filterDefaultAction: FilterAction;
  filterRules: FilterRule[];
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
  filterDefaultAction: 'ignore',
  filterRules: [],
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
