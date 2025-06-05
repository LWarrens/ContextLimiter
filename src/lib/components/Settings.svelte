<script lang="ts">
	import { config, updateConfig, resetConfig } from '$lib/stores';
	import { type WindowType } from '$lib/types';
	import { isValidUrlPattern } from '$lib/stores';

	let saveMessage = '';
	let saveError = false;
	let newFilter = '';
	let filterError = '';

	// Handle numeric input changes
	function handleNumericChange(field: keyof typeof $config, value: string) {
		const numValue = parseInt(value);
		if (!isNaN(numValue) && numValue > 0) {
			updateConfig({ [field]: numValue });
			showSaveMessage('Settings saved', false);
		}
	}
	// Handle checkbox changes for window type exclusions
	function handleWindowTypeChange(
		field: keyof typeof $config,
		checked: boolean,
		windowType: WindowType,
		isForTabs: boolean
	) {
		updateConfig({ [field]: checked });

		// Also update the corresponding array
		const arrayField = isForTabs ? 'excludedWindowTypesForTabs' : 'excludedWindowTypesForWindows';
		const currentArray = $config[arrayField] as WindowType[];

		if (checked && !currentArray.includes(windowType)) {
			updateConfig({ [arrayField]: [...currentArray, windowType] });
		} else if (!checked && currentArray.includes(windowType)) {
			updateConfig({ [arrayField]: currentArray.filter((type) => type !== windowType) });
		}

		showSaveMessage('Settings saved', false);
	}

	// Handle filter mode change
	function handleFilterModeChange(value: string) {
		updateConfig({ filterMode: value as any });
		showSaveMessage('Settings saved', false);
	}

	// Add new filter
	function addFilter() {
		const filter = newFilter.trim();

		if (!filter) {
			showFilterError('Filter cannot be empty');
			return;
		}

		if (!isValidUrlPattern(filter)) {
			showFilterError('Invalid URL pattern');
			return;
		}

		if ($config.filters.includes(filter)) {
			showFilterError('Filter already exists');
			return;
		}

		updateConfig({ filters: [...$config.filters, filter] });
		newFilter = '';
		filterError = '';
		showSaveMessage('Filter added', false);
	}

	// Remove filter
	function removeFilter(index: number) {
		const newFilters = $config.filters.filter((_, i) => i !== index);
		updateConfig({ filters: newFilters });
		showSaveMessage('Filter removed', false);
	}

	// Reset to defaults
	function handleReset() {
		if (confirm('Are you sure you want to reset all settings to defaults?')) {
			resetConfig();
			showSaveMessage('Settings reset to defaults', false);
		}
	}

	// Show save message
	function showSaveMessage(message: string, isError: boolean) {
		saveMessage = message;
		saveError = isError;
		setTimeout(() => {
			saveMessage = '';
			saveError = false;
		}, 3000);
	}

	// Show filter error
	function showFilterError(message: string) {
		filterError = message;
		setTimeout(() => {
			filterError = '';
		}, 3000);
	}

	// Handle Enter key in filter input
	function handleFilterKeypress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			addFilter();
		}
	}
</script>

<div class="settings-container space-y-6">
	<!-- Tab Limits Section -->
	<section class="card p-6">
		<h2 class="h3 font-bold mb-2">Tab Limits</h2>
		<p style="color: var(--color-surface-600);" class="mb-4">
			Configure maximum tab and window counts
		</p>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="form-group">
				<label for="maxTabs" class="label">Maximum Total Tabs</label>
				<input
					type="number"
					id="maxTabs"
					class="input"
					min="1"
					value={$config.maxTabs}
					on:blur={(e) => handleNumericChange('maxTabs', e.currentTarget.value)}
				/>
			</div>

			<div class="form-group">
				<label for="maxWindowTabs" class="label">Maximum Tabs Per Window</label>
				<input
					type="number"
					id="maxWindowTabs"
					class="input"
					min="1"
					value={$config.maxWindowTabs}
					on:blur={(e) => handleNumericChange('maxWindowTabs', e.currentTarget.value)}
				/>
			</div>

			<div class="form-group">
				<label for="maxWindows" class="label">Maximum Windows</label>
				<input
					type="number"
					id="maxWindows"
					class="input"
					min="1"
					value={$config.maxWindows}
					on:blur={(e) => handleNumericChange('maxWindows', e.currentTarget.value)}
				/>
			</div>
		</div>
	</section>

	<!-- Window Type Exclusions Section -->
	<section class="card p-6">
		<h2 class="h3 font-bold mb-2">Window Type Exclusions</h2>
		<p style="color: var(--color-surface-600);" class="mb-4">
			Exclude certain window types from tab and window counting
		</p>
		<div class="overflow-x-auto">
			<table class="min-w-full border rounded">
				<thead>
					<tr>
						<th class="px-2 py-1 text-left">Window Type</th>
						<th class="px-2 py-1">Exclude from Tabs</th>
						<th class="px-2 py-1">Exclude from Windows</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="px-2 py-1">Popup</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludePopupForTabs}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludePopupForTabs',
										e.currentTarget.checked,
										'popup',
										true
									)}
							/>
						</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludePopupForWindows}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludePopupForWindows',
										e.currentTarget.checked,
										'popup',
										false
									)}
							/>
						</td>
					</tr>
					<tr>
						<td class="px-2 py-1">Developer Tools</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludeDevtoolsForTabs}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludeDevtoolsForTabs',
										e.currentTarget.checked,
										'devtools',
										true
									)}
							/>
						</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludeDevtoolsForWindows}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludeDevtoolsForWindows',
										e.currentTarget.checked,
										'devtools',
										false
									)}
							/>
						</td>
					</tr>
					<tr>
						<td class="px-2 py-1">Panel</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludePanelForTabs}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludePanelForTabs',
										e.currentTarget.checked,
										'panel',
										true
									)}
							/>
						</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludePanelForWindows}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludePanelForWindows',
										e.currentTarget.checked,
										'panel',
										false
									)}
							/>
						</td>
					</tr>
					<tr>
						<td class="px-2 py-1">App</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludeAppForTabs}
								on:change={(e) =>
									handleWindowTypeChange('excludeAppForTabs', e.currentTarget.checked, 'app', true)}
							/>
						</td>
						<td class="px-2 py-1 text-center">
							<input
								type="checkbox"
								class="checkbox"
								checked={$config.excludeAppForWindows}
								on:change={(e) =>
									handleWindowTypeChange(
										'excludeAppForWindows',
										e.currentTarget.checked,
										'app',
										false
									)}
							/>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</section>

	<!-- URL Filtering Section -->
	<section class="card p-6">
		<h2 class="h3 font-bold mb-2">URL Filtering</h2>
		<p style="color: var(--color-surface-600);" class="mb-4">Set URL patterns to filter tabs</p>

		<div class="space-y-4">
			<div>
				<label for="filterMode" class="label">Tab Limit Filter Mode</label>
				<select
					id="filterMode"
					class="select"
					value={$config.filterMode}
					on:change={(e) => handleFilterModeChange(e.currentTarget.value)}
				>
					<option value="restrictlist">Only limit tabs with URLs that match filters</option>
					<option value="unrestrictlist"
						>Limit all tabs, while ignoring tabs with URLs that match filters</option
					>
				</select>
			</div>

			<!-- Add Filter -->
			<div>
				<label for="newFilter" class="label">Add URL Pattern</label>
				<div class="input-group input-group-divider grid-cols-[1fr_auto]">
					<input
						type="text"
						id="newFilter"
						placeholder="example.com or *.example.com"
						bind:value={newFilter}
						on:keypress={handleFilterKeypress}
					/>
					<button class="variant-filled-secondary" on:click={addFilter}>Add</button>
				</div>
				{#if filterError}
					<p class="text-error-500 text-sm mt-1">{filterError}</p>
				{/if}
			</div>
			<!-- Current Filters -->
			<div>
				<h4 class="h5 font-semibold mb-2">Current Filters</h4>
				<div class="space-y-2 mt-2">
					{#if $config.filters.length === 0}
						<p style="color: var(--color-surface-500);" class="italic">
							No filters added. Add patterns above.
						</p>
					{:else}
						{#each $config.filters as filter, index}
							<div
								class="flex items-center justify-between bg-surface-100 dark:bg-surface-800 p-2 rounded"
							>
								<span class="font-mono text-sm">{filter}</span>
								<button
									class="btn btn-sm variant-filled-error"
									on:click={() => removeFilter(index)}
								>
									×
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Navigation Behavior Information -->
	<section class="card p-6" style="background-color: var(--color-surface-50);">
		<h2 class="h3 font-bold mb-2">Navigation Behavior</h2>
		<div class="space-y-3">
			<p class="font-semibold">How Context Limiter works:</p>
			<ul class="list-disc list-inside space-y-1 text-sm">
				<li>
					Context Limiter will <strong>prevent new tabs</strong> from being created when you've reached
					your limits.
				</li>
				<li>
					Existing tabs can <strong>freely navigate</strong> to any URL even if you've reached your limits.
				</li>
				<li>
					This ensures your active browsing is never interrupted while still enforcing tab limits.
				</li>
			</ul>
			<p class="text-sm p-3 rounded" style="background-color: var(--color-surface-100);">
				<strong>Example:</strong> If your limit is 5 tabs per window and you already have 5 tabs open,
				clicking a link that would open a new tab will be blocked. However, you can still navigate any
				of your existing 5 tabs to any website.
			</p>
		</div>
	</section>

	<!-- Action Buttons -->
	<div class="flex items-center justify-between">
		<button class="btn variant-ghost" on:click={handleReset}> Reset to Defaults </button>
		<div>
			{#if saveMessage}
				<p class="text-sm {saveError ? 'text-error-500' : 'text-success-500'}">{saveMessage}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.settings-container {
		max-width: 400px;
		margin: 0 auto;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		margin-bottom: 1rem;
	}
	.form-group input {
		width: 80px;
		padding: 0.5rem;
		border: 1px solid var(--color-surface-300);
		border-radius: var(--radius-container);
		background-color: var(--color-surface-50);
	}
</style>
