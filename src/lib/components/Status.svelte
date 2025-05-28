<script lang="ts">
	import {
		config,
		tabCounts,
		lastUpdated,
		filteredTabsDisplay,
		windowsDisplay,
		filterModeInfo
	} from '$lib/stores';
	import { onMount } from 'svelte';

	let formattedTime = '';

	// Format the last updated time
	$: if ($lastUpdated) {
		formattedTime = $lastUpdated.toLocaleTimeString();
	}

	// Calculate progress percentages for visual indicators
	$: totalTabsProgress = Math.min(($tabCounts.totalTabs / $config.maxTabs) * 100, 100);
	$: windowsProgress = Math.min(($tabCounts.totalWindows / $config.maxWindows) * 100, 100);

	// Get progress color based on percentage
	function getProgressColor(percentage: number): string {
		if (percentage >= 90) return 'bg-error-500';
		if (percentage >= 75) return 'bg-warning-500';
		return 'bg-success-500';
	}

	// Get badge variant based on usage
	function getBadgeVariant(current: number, max: number): string {
		const percentage = (current / max) * 100;
		if (percentage >= 90) return 'variant-filled-error';
		if (percentage >= 75) return 'variant-filled-warning';
		return 'variant-filled-success';
	}
</script>

<div class="status-container space-y-6">
	<!-- Current Status Card -->
	<section class="card p-6">
		<h2 class="h3 font-bold mb-4">Current Status</h2>

		<div class="flex items-center justify-between mb-4">
			<span class="text-sm text-surface-600 dark:text-surface-400">
				Last updated: {formattedTime}
			</span>
			<span class="badge variant-soft-primary">Real-time updates enabled</span>
		</div>

		<!-- Tab Statistics -->
		<div class="space-y-4">
			<!-- Total Tabs -->
			<div class="stat-row">
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium">Filtered Tabs</span>
					<span class="badge {getBadgeVariant($tabCounts.totalTabs, $config.maxTabs)}">
						{$filteredTabsDisplay}
					</span>
				</div>
				<div class="progress-bar">
					<div
						class="progress-fill {getProgressColor(totalTabsProgress)}"
						style="width: {totalTabsProgress}%"
					></div>
				</div>
			</div>

			<!-- Windows -->
			<div class="stat-row">
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium">Windows</span>
					<span class="badge {getBadgeVariant($tabCounts.totalWindows, $config.maxWindows)}">
						{$windowsDisplay}
					</span>
				</div>
				<div class="progress-bar">
					<div
						class="progress-fill {getProgressColor(windowsProgress)}"
						style="width: {windowsProgress}%"
					></div>
				</div>
			</div>

			<!-- Per-Window Tab Counts -->
			<div class="space-y-2">
				<h4 class="font-medium">Per-Window Details</h4>
				{#each $tabCounts.tabsByWindow as window}
					{@const windowProgress = Math.min((window.tabCount / $config.maxWindowTabs) * 100, 100)}
					<div class="window-detail">
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm font-mono">{window.activeTabTitle}</span>
							<span
								class="badge variant-soft {getBadgeVariant(window.tabCount, $config.maxWindowTabs)}"
							>
								{window.tabCount}/{$config.maxWindowTabs}
							</span>
						</div>
						<div class="progress-bar small">
							<div
								class="progress-fill {getProgressColor(windowProgress)}"
								style="width: {windowProgress}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Filter Information -->
		<div class="mt-6 p-4 bg-surface-50 dark:bg-surface-800 rounded">
			<p class="text-sm font-medium mb-2">{$filterModeInfo}</p>
			{#if $config.filters.length > 0}
				<div class="space-y-1">
					<p class="text-xs text-surface-600 dark:text-surface-400">Active patterns:</p>
					{#each $config.filters.slice(0, 3) as filter}
						<code class="text-xs bg-surface-200 dark:bg-surface-700 px-2 py-1 rounded block"
							>{filter}</code
						>
					{/each}
					{#if $config.filters.length > 3}
						<p class="text-xs text-surface-500">...and {$config.filters.length - 3} more</p>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Behavior Information -->
	<section class="card p-6 bg-surface-50 dark:bg-surface-800">
		<h3 class="h4 font-bold mb-3">How It Works</h3>
		<p class="text-sm mb-3">
			<strong>Context Limiter prevents new tabs</strong> from being created when limits are reached,
			but allows navigation within existing tabs.
		</p>

		<div class="space-y-2">
			<h4 class="text-sm font-semibold">Browser-specific URL patterns:</h4>
			<ul class="text-xs space-y-1 text-surface-600 dark:text-surface-400">
				<li>
					<code class="bg-surface-200 dark:bg-surface-700 px-1 rounded">chrome://*</code> - All Chrome
					URLs
				</li>
				<li>
					<code class="bg-surface-200 dark:bg-surface-700 px-1 rounded">*://newtab</code> - New tab in
					any browser
				</li>
				<li>
					<code class="bg-surface-200 dark:bg-surface-700 px-1 rounded">//newtab</code> - Alternative
					pattern for new tabs
				</li>
			</ul>
		</div>
	</section>
</div>

<style>
	.status-container {
		max-width: 400px;
		margin: 0 auto;
	}

	.stat-row {
		margin-bottom: 0.5rem;
	}

	.progress-bar {
		width: 100%;
		height: 0.5rem;
		background-color: rgb(229 229 229);
		border-radius: 9999px;
		overflow: hidden;
	}

	:global(.dark) .progress-bar {
		background-color: rgb(55 65 81);
	}

	.progress-bar.small {
		height: 0.25rem;
	}

	.progress-fill {
		height: 100%;
		transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.window-detail {
		padding: 0.75rem;
		background-color: rgb(248 250 252);
		border-radius: 0.375rem;
		border: 1px solid rgb(203 213 225);
	}

	:global(.dark) .window-detail {
		background-color: rgb(30 41 59);
		border-color: rgb(71 85 105);
	}
</style>
