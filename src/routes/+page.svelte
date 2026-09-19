<script lang="ts">
	import { config, updateConfig, saveState, saveError } from '$lib/stores';
	import Status from '$lib/components/Status.svelte';
	import Settings from '$lib/components/Settings.svelte';

	let activeTab: 'status' | 'settings' = 'status';
</script>

<svelte:head><title>Context Limiter</title></svelte:head>

<div class="app-shell">
	<header class="app-header">
		<div class="brand-row">
			<div class="brand">
				<span class="brand-mark" aria-hidden="true">cl</span>
				<div>
					<h1>Context Limiter</h1>
					<p>A little room to focus.</p>
				</div>
			</div>
			<label class="power-control">
				<input
					type="checkbox"
					role="switch"
					aria-label="Enable tab limiting"
					checked={$config.enabled}
					disabled={$saveState === 'saving'}
					on:change={(event) => updateConfig({ enabled: event.currentTarget.checked })}
				/>
				<span>{$config.enabled ? 'Active' : 'Paused'}</span>
			</label>
		</div>
		<nav class="view-nav" aria-label="Views">
			<button
				class:current={activeTab === 'status'}
				aria-pressed={activeTab === 'status'}
				on:click={() => (activeTab = 'status')}>Overview</button
			>
			<button
				class:current={activeTab === 'settings'}
				aria-pressed={activeTab === 'settings'}
				on:click={() => (activeTab = 'settings')}>Settings</button
			>
		</nav>
	</header>
	<main>
		{#if $saveState === 'error'}<p class="notice error" role="alert">
				{$saveError || 'Could not save changes.'}
			</p>{/if}
		{#if activeTab === 'status'}
			<Status on:settings={() => (activeTab = 'settings')} />
		{:else}
			<Settings />
		{/if}
	</main>
</div>
