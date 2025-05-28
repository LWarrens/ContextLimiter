<script lang="ts">
	import { config, updateConfig, resetConfig } from '$lib/stores';
	import { FILTER_PRESETS, type WindowType } from '$lib/types';
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

	// Apply preset
	function applyPreset(presetKey: string) {
		const preset = FILTER_PRESETS[presetKey];
		if (!preset) return;

		const newFilters = [...$config.filters];
		preset.filters.forEach((filter) => {
			if (!newFilters.includes(filter)) {
				newFilters.push(filter);
			}
		});

		updateConfig({
			filters: newFilters,
			...(preset.filterMode && { filterMode: preset.filterMode as any })
		});
		showSaveMessage(`Applied ${preset.name} preset`, false);
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
		<p class="text-surface-600 dark:text-surface-400 mb-4">
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
		<p class="text-surface-600 dark:text-surface-400 mb-4">
			Exclude certain window types from tab and window counting
		</p>

		<div class="space-y-6">
			<div>
				<h4 class="h4 font-semibold mb-2">Exclude from Tab Counting</h4>
				<p class="text-sm text-surface-600 dark:text-surface-400 mb-3">
					These window types won't count toward total tab limits or per-window tab limits
				</p>
				<div class="space-y-2">
					<label class="flex items-center space-x-2">
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
						<span>Popup Windows</span>
					</label>
					<label class="flex items-center space-x-2">
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
						<span>Developer Tools</span>
					</label>
					<label class="flex items-center space-x-2">
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
						<span>Panel Windows</span>
					</label>
					<label class="flex items-center space-x-2">
						<input
							type="checkbox"
							class="checkbox"
							checked={$config.excludeAppForTabs}
							on:change={(e) =>
								handleWindowTypeChange('excludeAppForTabs', e.currentTarget.checked, 'app', true)}
						/>
						<span>App Windows</span>
					</label>
				</div>
			</div>

			<div>
				<h4 class="h4 font-semibold mb-2">Exclude from Window Counting</h4>
				<p class="text-sm text-surface-600 dark:text-surface-400 mb-3">
					These window types won't count toward the maximum windows limit
				</p>
				<div class="space-y-2">
					<label class="flex items-center space-x-2">
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
						<span>Popup Windows</span>
					</label>
					<label class="flex items-center space-x-2">
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
						<span>Developer Tools</span>
					</label>
					<label class="flex items-center space-x-2">
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
						<span>Panel Windows</span>
					</label>
					<label class="flex items-center space-x-2">
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
						<span>App Windows</span>
					</label>
				</div>
			</div>
		</div>
	</section>

	<!-- URL Filtering Section -->
	<section class="card p-6">
		<h2 class="h3 font-bold mb-2">URL Filtering</h2>
		<p class="text-surface-600 dark:text-surface-400 mb-4">Set URL patterns to filter tabs</p>

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
						<p class="text-surface-500 italic">No filters added. Add patterns above.</p>
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

			<!-- Filter Presets -->
			<div>
				<h4 class="h5 font-semibold mb-2">Filter Presets</h4>
				<div class="flex flex-wrap gap-2 mt-2">
					{#each Object.entries(FILTER_PRESETS) as [key, preset]}
						<button
							class="btn variant-ghost-secondary"
							title={preset.description}
							on:click={() => applyPreset(key)}
						>
							{preset.name}
						</button>
					{/each}
				</div>
				<p class="text-sm text-surface-600 dark:text-surface-400 mt-2">
					Click to add preset filters to your list
				</p>
			</div>
		</div>
	</section>

	<!-- Navigation Behavior Information -->
	<section class="card p-6 bg-surface-50 dark:bg-surface-800">
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
			<p class="text-sm bg-surface-100 dark:bg-surface-700 p-3 rounded">
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
</style>
