<script lang="ts">
	import Settings from '$lib/components/Settings.svelte';
	import { config } from '$lib/stores';
</script>

<svelte:head>
	<title>Context Limiter Settings</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<div class="container">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="h1 font-bold">Context Limiter Settings</h1>
					<p class="text-surface-600 dark:text-surface-400">
						Configure tab limits and URL filtering
					</p>
				</div>
				<button
					class="btn variant-ghost-surface"
					on:click={() => (window.location.href = 'index.html')}
				>
					← Back to Status
				</button>
			</div>
		</div>
	</header>

	<main class="container py-8">
		<Settings />
	</main>
</div>

<style>
	.settings-page {
		@apply min-h-screen bg-surface-50 dark:bg-surface-900;
	}

	.page-header {
		@apply bg-white dark:bg-surface-800 border-b border-surface-300 dark:border-surface-600;
	}

	.page-header .container {
		@apply max-w-4xl mx-auto px-4 py-8;
	}

	.container {
		@apply max-w-4xl mx-auto px-4;
	}
</style>
