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

	function toggleEnabled() {
		console.log('[ContextLimiter] toggleEnabled called. enabled before:', enabled);
		updateConfig({ enabled: !enabled });
		setTimeout(() => {
			console.log('[ContextLimiter] toggleEnabled after updateConfig. enabled is now:', enabled);
		}, 100);
	}
	// Svelte store subscription
	$: $config = $config;
</script>

<svelte:head>
	<title>Context Limiter</title>
</svelte:head>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900">
	<!-- Header with Navigation and Toggle -->
	<header
		class="bg-white dark:bg-surface-800 border-b border-surface-300 dark:border-surface-600 sticky top-0 z-10"
	>
		<div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
			<div class="flex space-x-1 bg-surface-100 dark:bg-surface-700 rounded-lg p-1">
				<button
					class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 {activeTab ===
					'status'
						? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-surface-100 shadow-sm'
						: 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'}"
					on:click={() => setActiveTab('status')}
				>
					Status
				</button>
				<button
					class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 {activeTab ===
					'settings'
						? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-surface-100 shadow-sm'
						: 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100'}"
					on:click={() => setActiveTab('settings')}
				>
					Settings
				</button>
			</div>

			<div class="flex items-center space-x-3">
				<label class="flex items-center space-x-3">
					<input type="checkbox" class="sr-only" bind:checked={enabled} on:change={toggleEnabled} />
					<div
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 {enabled
							? 'bg-primary-500'
							: 'bg-surface-300 dark:bg-surface-600'}"
					>
						<div
							class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200 {enabled
								? 'translate-x-5'
								: 'translate-x-0'}"
						></div>
					</div>
					<span class="text-sm font-medium text-surface-700 dark:text-surface-300"
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

<!-- No styles needed, using inline classes -->
