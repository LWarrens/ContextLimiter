<script lang="ts">
	import { config, updateConfig, resetConfig, saveError, saveState, syncWindowExclusions } from '$lib/stores';
	import { type FilterAction, type FilterRule, type WindowType } from '$lib/types';
	import { isValidUrlPattern } from '$lib/stores';

	let newFilter = '';
	let newRuleAction: FilterAction = 'count';
	let filterError = '';

	// Handle numeric input changes
	async function handleNumericChange(field: keyof typeof $config, value: string) {
		const numValue = Number(value);
		if (!Number.isSafeInteger(numValue) || numValue <= 0) {
			showFilterError('Limits must be positive whole numbers');
			return;
		}
		await updateConfig({ [field]: numValue });
	}
	// Handle checkbox changes for window type exclusions
	function handleWindowTypeChange(
		field: keyof typeof $config,
		checked: boolean,
		windowType: WindowType,
		isForTabs: boolean
	) {
		void isForTabs;
		void windowType;
		const next = syncWindowExclusions({ ...$config, [field]: checked });
		return updateConfig(next);
	}

	async function handleDefaultActionChange(action: FilterAction) {
		await updateConfig({ filterDefaultAction: action });
	}

	// Add new rule
	async function addRule() {
		const filter = newFilter.trim();

		if (!filter) {
			showFilterError('Filter cannot be empty');
			return;
		}

		if (!isValidUrlPattern(filter)) {
			showFilterError('Invalid URL pattern');
			return;
		}

		if ($config.filterRules.some((rule) => rule.pattern === filter && rule.action === newRuleAction)) {
			showFilterError('Rule already exists');
			return;
		}

		const nextRules: FilterRule[] = [
			...$config.filterRules,
			{ pattern: filter, action: newRuleAction, enabled: true }
		];
		const saved = await updateConfig({ filterRules: nextRules });
		if (!saved) return;
		newFilter = '';
		filterError = '';
	}

	async function removeRule(index: number) {
		const nextRules = $config.filterRules.filter((_, i) => i !== index);
		await updateConfig({ filterRules: nextRules });
	}

	async function toggleRuleEnabled(index: number) {
		const nextRules = $config.filterRules.map((rule, i) =>
			i === index ? { ...rule, enabled: rule.enabled === false ? true : false } : rule
		);
		await updateConfig({ filterRules: nextRules });
	}

	async function toggleRuleAction(index: number) {
		const nextRules = $config.filterRules.map((rule, i) =>
			i === index
				? { ...rule, action: rule.action === 'count' ? 'ignore' : 'count' as FilterAction }
				: rule
		);
		await updateConfig({ filterRules: nextRules });
	}

	// Reset to defaults
	async function handleReset() {
		if (confirm('Are you sure you want to reset all settings to defaults?')) {
			await resetConfig();
		}
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
			addRule();
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

		<div class="tab-limits-row">
			<div class="form-group compact">
				<label for="maxTabs" class="label">Total Tabs</label>
				<input
					type="number"
					id="maxTabs"
					class="input compact"
					min="1"
					value={$config.maxTabs}
					on:blur={(e) => handleNumericChange('maxTabs', e.currentTarget.value)}
				/>
			</div>
			<div class="form-group compact">
				<label for="maxWindowTabs" class="label">Per Window</label>
				<input
					type="number"
					id="maxWindowTabs"
					class="input compact"
					min="1"
					value={$config.maxWindowTabs}
					on:blur={(e) => handleNumericChange('maxWindowTabs', e.currentTarget.value)}
				/>
			</div>
			<div class="form-group compact">
				<label for="maxWindows" class="label">Windows</label>
				<input
					type="number"
					id="maxWindows"
					class="input compact"
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
		<p style="color: var(--color-surface-600);" class="mb-4">Use explicit rules with a default action</p>

		<div class="space-y-4">
			<div>
				<p class="label" id="defaultActionLabel">Default Action</p>
				<div class="switch-row">
					<button
						type="button"
						class="switch-btn {$config.filterDefaultAction === 'ignore' ? 'active' : ''}"
						aria-pressed={$config.filterDefaultAction === 'ignore'}
						on:click={() => handleDefaultActionChange('ignore')}
					>
						Ignore by default
					</button>
					<button
						type="button"
						class="switch-btn {$config.filterDefaultAction === 'count' ? 'active' : ''}"
						aria-pressed={$config.filterDefaultAction === 'count'}
						on:click={() => handleDefaultActionChange('count')}
					>
						Count by default
					</button>
					<div
						class="switch-slider"
						style="left: {$config.filterDefaultAction === 'ignore' ? '0%' : '50%'}"
					></div>
				</div>
			</div>

			<!-- Add Rule -->
			<div>
				<label class="label" for="newFilter">Add rule</label>
				<div class="switch-row">
					<span id="ruleActionLabel" class="sr-only">Rule action</span>
					<button
						type="button"
						class="switch-btn {newRuleAction === 'count' ? 'active' : ''}"
						aria-pressed={newRuleAction === 'count'}
						on:click={() => (newRuleAction = 'count')}
					>
						Count matches
					</button>
					<button
						type="button"
						class="switch-btn {newRuleAction === 'ignore' ? 'active' : ''}"
						aria-pressed={newRuleAction === 'ignore'}
						on:click={() => (newRuleAction = 'ignore')}
					>
						Ignore matches
					</button>
					<div
						class="switch-slider"
						style="left: {newRuleAction === 'count' ? '0%' : '50%'}"
					></div>
				</div>
				<div class="input-group input-group-divider grid-cols-[1fr_auto] add-filter-group">
					<input
						type="text"
						id="newFilter"
						placeholder="example.com or *.example.com"
						aria-describedby="ruleHelp"
						bind:value={newFilter}
						on:keypress={handleFilterKeypress}
						class="add-filter-input"
					/>
					<button class="add-btn" on:click={addRule}>Add rule</button>
				</div>
				<p id="ruleHelp" class="helper">Bare domains match any protocol and path. The first enabled match wins.</p>
				{#if filterError}
					<p class="text-error-500 text-sm mt-1">{filterError}</p>
				{/if}
			</div>
			<!-- Current Rules -->
			<div>
				<h4 class="h5 font-semibold mb-2">Current Rules</h4>
				<div class="space-y-2 mt-2">
					{#if $config.filterRules.length === 0}
						<p style="color: var(--color-surface-500);" class="italic">
							No rules added. Add rules above.
						</p>
					{:else}
						{#each $config.filterRules as rule, index}
							<div class="filter-pill">
								<button
									class="btn btn-sm variant-soft"
									on:click={() => toggleRuleEnabled(index)}
								>
									{rule.enabled === false ? 'Disabled' : 'Enabled'}
								</button>
								<button class="btn btn-sm variant-soft" on:click={() => toggleRuleAction(index)}>
									{rule.action === 'count' ? 'Count' : 'Ignore'}
								</button>
								<span class="font-mono text-sm">{rule.pattern}</span>
								<button
									class="btn btn-sm variant-filled-error"
									on:click={() => removeRule(index)}
									aria-label={`Remove rule ${rule.pattern}`}
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
			{#if $saveState === 'saving'}
				<p class="text-sm" role="status">Saving changes…</p>
			{:else if $saveState === 'saved'}
				<p class="text-sm text-success-500" role="status">Changes saved</p>
			{:else if $saveState === 'error'}
				<p class="text-sm text-error-500" role="alert">{$saveError || 'Could not save changes.'}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.settings-container {
		max-width: 400px;
		margin: 0 auto;
	}
	.card {
		background-color: var(--color-surface-100);
		/* Add a subtle shadow for card effect */
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
		border-radius: var(--radius-container);
	}
	.tab-limits-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
		margin-bottom: 0.5rem;
	}
	.form-group.compact {
		flex: 1 1 0;
		margin-bottom: 0;
	}
	.input.compact {
		width: 60px;
		padding: 0.3rem 0.5rem;
		font-size: 0.95rem;
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
	.switch-row {
		position: relative;
		display: flex;
		width: 100%;
		background: var(--color-surface-200);
		border-radius: 999px;
		margin: 0.5rem 0 1rem 0;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
	}
	.switch-btn {
		flex: 1 1 0;
		padding: 0.5rem 1rem;
		background: none;
		border: none;
		color: var(--color-surface-700);
		font-size: 0.97rem;
		font-weight: 500;
		border-radius: 999px;
		z-index: 1;
		cursor: pointer;
		transition: color 0.2s;
	}
	.switch-btn.active {
		color: var(--color-primary-700);
	}
	.switch-slider {
		position: absolute;
		top: 2px;
		left: 0;
		width: 50%;
		height: calc(100% - 4px);
		background: var(--color-primary-100);
		border-radius: 999px;
		z-index: 0;
		transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.add-btn {
		padding: 0.45rem 1.1rem;
		font-size: 1rem;
		font-weight: 500;
		border: 1.5px solid var(--color-primary-400);
		background: var(--color-primary-50);
		color: var(--color-primary-700);
		border-radius: var(--radius-container);
		transition:
			background 0.15s,
			border 0.15s;
		cursor: pointer;
	}
	.add-btn:hover,
	.add-btn:focus {
		background: var(--color-primary-100);
		border-color: var(--color-primary-500);
	}
</style>
