<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { config, tabCounts, lastUpdated, connectionState } from '$lib/stores';
	import UsageMeter from './UsageMeter.svelte';

	const dispatch = createEventDispatcher<{ settings: void }>();
	$: activeRules = $config.filterRules.filter((rule) => rule.enabled !== false);
	$: setupNeeded =
		$config.filterDefaultAction === 'ignore' &&
		!activeRules.some((rule) => rule.action === 'count');
</script>

<div class="stack">
	{#if $connectionState !== 'ready'}
		<p class="notice" role="status">
			{$connectionState === 'loading'
				? 'Loading your browser usage…'
				: 'Connection interrupted. Usage may be out of date.'}
		</p>
	{/if}
	{#if !$config.enabled}
		<p class="notice">Limiting is paused. Your usage is still shown below.</p>
	{/if}
	{#if setupNeeded}
		<div class="setup-notice">
			<span class="notice-icon" aria-hidden="true">i</span>
			<div>
				<strong>Choose which sites count</strong>
				<p>No sites are being counted yet.</p>
				<button class="text-button" on:click={() => dispatch('settings')}
					>Set up your rules <span aria-hidden="true">→</span></button
				>
			</div>
		</div>
	{/if}

	<div class="section-heading">
		<h2>Browser usage</h2>
		<span class="eyebrow">LIVE OVERVIEW</span>
	</div>
	<div class="metrics">
		<UsageMeter label="Counted tabs" value={$tabCounts.totalTabs} limit={$config.maxTabs} />
		<UsageMeter label="Windows" value={$tabCounts.totalWindows} limit={$config.maxWindows} />
	</div>

	<section class="window-section" aria-labelledby="windows-heading">
		<div class="section-heading">
			<h2 id="windows-heading">Your windows</h2>
			<span class="subtle">{$tabCounts.tabsByWindow.length} open</span>
		</div>
		<div class="window-list">
			{#each $tabCounts.tabsByWindow as window, index (window.windowId)}
				<div class="window-row">
					<span class="window-icon" aria-hidden="true"><span></span></span>
					<div class="window-content">
						<div class="window-meta">
							<span>Window {index + 1}</span><span>{window.tabCount} / {$config.maxWindowTabs}</span
							>
						</div>
						<p class="window-title" title={window.activeTabTitle}>{window.activeTabTitle}</p>
						<UsageMeter
							label={'Window ' + (index + 1)}
							value={window.tabCount}
							limit={$config.maxWindowTabs}
							compact
						/>
					</div>
				</div>
			{:else}
				<p class="empty-state">Window details will appear here when available.</p>
			{/each}
		</div>
	</section>

	<button class="policy-summary" on:click={() => dispatch('settings')}>
		<span
			><strong
				>{$config.filterDefaultAction === 'count'
					? 'Count sites by default'
					: 'Ignore sites by default'}</strong
			><small>{activeRules.length} active {activeRules.length === 1 ? 'rule' : 'rules'}</small
			></span
		>
		<span aria-hidden="true">→</span>
	</button>
	{#if $lastUpdated}<p class="updated-at">
			Updated {$lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
		</p>{/if}
</div>
