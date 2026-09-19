<script lang="ts">
	import { config, updateConfig } from '$lib/stores';
	import Status from '$lib/components/Status.svelte';
	import Settings from '$lib/components/Settings.svelte';

	let activeTab: 'status' | 'settings' = 'status';
	let enabled = false;
	// Svelte auto-subscription
	$: enabled = $config.enabled;

	function setActiveTab(tab: 'status' | 'settings') {
		activeTab = tab;
	}

	async function toggleEnabled() {
		await updateConfig({ enabled: !enabled });
	}
</script>

<svelte:head>
	<title>Context Limiter</title>
</svelte:head>

<div
	class="min-h-screen"
	style="background-color: var(--color-surface-200); font-family: var(--base-font-family);"
>
	<!-- Header with Navigation and Toggle -->
	<header
		style="background-color: var(--color-surface-100); border-bottom: 1px solid var(--color-surface-300); position: sticky; top: 0; z-index: 10;"
	>
		<div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
			<div
				role="tablist"
				class="flex space-x-1 rounded-lg p-1"
				style="background-color: var(--color-surface-100);"
			>
				<button
					class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
					role="tab"
					aria-selected={activeTab === 'status'}
					style={activeTab === 'status'
						? 'background-color: var(--color-surface-200); color: var(--color-surface-900); box-shadow: 0 1px 2px 0 var(--color-surface-300);'
						: 'color: var(--color-surface-600);'}
					on:click={() => setActiveTab('status')}
				>
					Status
				</button>
				<button
					class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
					role="tab"
					aria-selected={activeTab === 'settings'}
					style={activeTab === 'settings'
						? 'background-color: var(--color-surface-200); color: var(--color-surface-900); box-shadow: 0 1px 2px 0 var(--color-surface-300);'
						: 'color: var(--color-surface-600);'}
					on:click={() => setActiveTab('settings')}
				>
					Settings
				</button>
			</div>

			<div class="flex items-center space-x-3">
				<label class="flex items-center space-x-3">
					<input type="checkbox" class="sr-only" bind:checked={enabled} on:change={toggleEnabled} />
					<div
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
						style="background-color: {enabled
							? 'var(--color-primary-500)'
							: 'var(--color-surface-300)'};"
					>
						<div
							class="absolute left-1 top-1 h-4 w-4 rounded-full transition-transform duration-200"
							style="background-color: var(--color-surface-50); transform: {enabled
								? 'translateX(1.25rem)'
								: 'translateX(0)'};"
						></div>
					</div>
					<span class="text-sm font-medium" style="color: var(--color-surface-700);"
						>{enabled ? 'Enabled' : 'Disabled'}</span
					>
				</label>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-4xl mx-auto px-4 py-8">
		{#if activeTab === 'status'}
			<Status />
		{:else}
			<Settings />
		{/if}
	</main>
</div>

<style>
	/* Global styles for the page */
	:global(body) {
		color: var(--color-surface-950);
	}
</style>
