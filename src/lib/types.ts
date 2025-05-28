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

export interface FilterPreset {
  name: string;
  description: string;
  filters: string[];
  filterMode?: string;
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

export const FILTER_PRESETS: Record<string, FilterPreset> = {
  social: {
    name: 'Social Media',
    description: 'Common social media platforms',
    filters: [
      '*://facebook.com/*',
      '*://twitter.com/*',
      '*://instagram.com/*',
      '*://linkedin.com/*',
      '*://reddit.com/*',
      '*://tiktok.com/*'
    ]
  },
  productivity: {
    name: 'Productivity',
    description: 'Work and productivity tools',
    filters: [
      '*://docs.google.com/*',
      '*://drive.google.com/*',
      '*://office.com/*',
      '*://notion.so/*',
      '*://slack.com/*',
      '*://trello.com/*'
    ]
  },
  news: {
    name: 'News',
    description: 'News and media sites',
    filters: [
      '*://cnn.com/*',
      '*://bbc.com/*',
      '*://reuters.com/*',
      '*://npr.org/*',
      '*://theguardian.com/*'
    ]
  },
  entertainment: {
    name: 'Entertainment',
    description: 'Entertainment and streaming platforms',
    filters: [
      '*://youtube.com/*',
      '*://netflix.com/*',
      '*://twitch.tv/*',
      '*://spotify.com/*',
      '*://hulu.com/*'
    ]
  },
  browser: {
    name: 'Browser Pages',
    description: 'Browser-specific pages and new tabs',
    filters: [
      'chrome://*',
      'brave://*',
      'edge://*',
      'firefox://*',
      '*://newtab',
      'about:*'
    ]
  }
};
