<script lang="ts">
	import { config, tabCounts, lastUpdated, filteredTabsDisplay, windowsDisplay } from '$lib/stores';
	import { onMount } from 'svelte';

	let formattedTime = '';

	// Format the last updated time
	$: if ($lastUpdated) {
		formattedTime = $lastUpdated.toLocaleTimeString();
	}

	// Calculate progress percentages for visual indicators
	$: totalTabsProgress = Math.min(($tabCounts.totalTabs / $config.maxTabs) * 100, 100);
	$: windowsProgress = Math.min(($tabCounts.totalWindows / $config.maxWindows) * 100, 100);

	// // Get progress color based on percentage
	// function getProgressColor(percentage: number): string {
	// 	const okColor = 'green'
	// 	if (percentage < 60) return okColor; // Green only
	// 	// linear transition green percentage and orange percentage from 100 to 80 and 0 to 20 from 60 to 75
	// 	if (percentage < 75) {
	// 		const okStop = 100 - (percentage - 60) * (20 / 15); // 100% at 60, down to 80% at 75
	// 		const warningStop = (percentage - 60) * (20 / 15); // 0% at 60, up to 20% at 75
	// 		return `linear-gradient(90deg, ${okColor} ${okStop}%, orange ${okStop + warningStop}%)`;
	// 	}
	// 	if (percentage < 90) {
	// 		// linear transition green percentage and orange percentage from 80 to 66 and 20 to 33 from 75 to 90
	// 		const okStop = Math.max(80 - (percentage - 75) * (14 / 15), 60); // 80% at 75, down to 66% at 90
	// 		const warningStop = Math.min(20 + (percentage - 75) * (13 / 15), 30); // 20% at 75, up to 33% at 90
	// 		return `linear-gradient(90deg, ${okColor} ${okStop}%, orange ${okStop + warningStop}%)`;
	// 	}
	// 	// linear transition green percentage and orange percentage from 66 to 60 and 33 to 30 from 90 to 100
	// 	const okStop = Math.max(66 - (percentage - 90) * (6 / 10), 60); // 66% at 90, down to 60% at 100
	// 	const warningStop = Math.min(33 - (percentage - 90) * (3 / 10), 30); // 33% at 90, down to 30% at 100
	// 	return `linear-gradient(90deg, ${okColor} ${okStop}%, orange ${okStop + warningStop}%, red 100%)`;
	// }

	// Get progress color as a CSS linear gradient string based on percentage
	function getProgressColor(percentage: number): string {
		const okColor = 'green';
		const warnColor = 'orange';
		const dangerColor = 'red';

		if (percentage < 60) {
			// Safe zone: pure green
			return okColor;
		}

		let okStop: number;
		let warnStop: number;

		if (percentage < 80) {
			// Green fades from 80% to 40%, orange grows from 20% to 40% from 60 to 80
			const t = (percentage - 60) / 20;
			okStop = 80 - t * 40;
			warnStop = 20 + t * 20;
			return `linear-gradient(90deg, ${okColor} ${okStop}%, ${warnColor} ${okStop + warnStop}%)`;
		}

		if (percentage < 90) {
			// Green fades from 40% to 30%, orange stays at 40%
			const t = (percentage - 80) / 10;
			okStop = 40 - t * 10;
			warnStop = 40;
			return `linear-gradient(90deg, ${okColor} ${okStop}%, ${warnColor} ${okStop + warnStop}%)`;
		}

		// Green fades from 30% to 20%, orange shrinks from 40% to 35%, red completes
		const t = (percentage - 90) / 10;
		okStop = 30 - t * 10;
		warnStop = 40 - t * 5;

		return `linear-gradient(90deg, ${okColor} ${okStop}%, ${warnColor} ${okStop + warnStop}%, ${dangerColor} 100%);`;
	}

	// Get badge variant based on usage
	function getBadgeVariant(current: number, max: number): string {
		const percentage = (current / max) * 100;
		if (percentage >= 90) return 'variant-filled-error';
		if (percentage >= 75) return 'variant-filled-warning';
		return 'variant-filled-success';
	}

	$: filterSummaryText = `Default: ${$config.filterDefaultAction === 'count' ? 'Count' : 'Ignore'} | Rules: ${$config.filterRules.length}`;
</script>

<div class="status-container space-y-6">
	<!-- Current Status Card -->
	<section class="card p-6">
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
						class="progress-fill"
						style="width: {totalTabsProgress}%; background: {getProgressColor(totalTabsProgress)};"
					></div>
					<div
						class="progress-dot"
						style="left: calc({totalTabsProgress}% - 4px); {totalTabsProgress > 80
							? `background: ${getProgressColor(totalTabsProgress)};`
							: ''}"
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
						class="progress-fill"
						style="width: {windowsProgress}%; background: {getProgressColor(windowsProgress)};"
					></div>
					<div
						class="progress-dot"
						style="left: calc({windowsProgress}% - 4px); {windowsProgress > 80
							? `background: ${getProgressColor(windowsProgress)};`
							: ''}"
					></div>
				</div>
			</div>

			<!-- Per-Window Tab Counts -->
			<div class="space-y-2">
				<h4 class="font-medium">Per-Window Details</h4>
				{#each $tabCounts.tabsByWindow as window}
					{@const windowProgress = Math.min((window.tabCount / $config.maxWindowTabs) * 100, 100)}
					<div
						class="window-detail"
						style="background-color: var(--color-surface-50); border-radius: var(--radius-container);"
					>
						<div class="tab-header">
							<span class="tab-title">{window.activeTabTitle}</span>
							<span
								class="badge variant-soft {getBadgeVariant(window.tabCount, $config.maxWindowTabs)}"
							>
								{window.tabCount}/{$config.maxWindowTabs}
							</span>
						</div>
						<div class="progress-bar small">
							<div
								class="progress-fill"
								style="width: {windowProgress}%; background: {getProgressColor(
									windowProgress
								)}; {windowsProgress > 90 ? `animation: vibrate 0.2s linear infinite;` : ''}"
							></div>
							<div
								class="progress-dot"
								style="left: calc({windowProgress}% - 4px); {windowProgress > 90
									? `background: red; box-shadow: 0 0 5px 3px red; animation: vibrate 0.1s linear infinite;`
									: windowProgress > 80
										? `background: #ffa500b5; box-shadow: 0 0 3px 2px #ffa500b5; animation: vibrate 0.4s linear infinite;`
										: ''}"
							></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Filter Information -->
		<div class="mt-6 p-4 rounded" style="background-color: var(--color-surface-50);">
			<p class="text-xm font-medium mb-2">{filterSummaryText}</p>
			{#if $config.filterRules.length > 0}
				<div class="space-y-1">
					<p class="text-xs" style="color: var(--color-surface-600);">Active rules:</p>
					{#each $config.filterRules.slice(0, 3) as rule}
						<code
							class="text-xm px-2 py-1 rounded block"
							style="background-color: var(--color-surface-200);"
						>{rule.action}:{rule.pattern}{rule.enabled === false ? ' (disabled)' : ''}</code
						>
					{/each}
					{#if $config.filterRules.length > 3}
						<p class="text-xm" style="color: var(--color-surface-500);">
							...and {$config.filterRules.length - 3} more
						</p>
					{/if}
				</div>
			{/if}
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
		border-radius: 9999px;
		position: relative;
	}

	.progress-bar.small {
		height: 0.25rem;
	}

	.progress-fill {
		height: 100%;
		transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
	}

	.progress-dot {
		position: relative;
		top: -95%;
		/* right: -6px; */
		/* half the size of the dot to center it */
		width: 4px;
		height: 90%;
		/* background: red; */
		/* border-radius: 50%; */
		border-top-right-radius: 10%;
		border-bottom-right-radius: 10%;
		border-top-left-radius: 50%;
		border-bottom-left-radius: 50%;
		z-index: 1; /* make sure it's on top */
	}

	.window-detail {
		padding: 0.75rem;
		border-radius: 0.375rem;
	}

	.tab-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.tab-title {
		flex: 1 1 0%;
		min-width: 0;
		font-family: monospace;
		font-size: 0.95em;
		word-break: break-word;
		white-space: normal;
		max-width: 220px;
		overflow-wrap: anywhere;
	}
</style>
