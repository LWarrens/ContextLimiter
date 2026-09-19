<script lang="ts">
	import {
		config,
		updateConfig,
		resetConfig,
		saveState,
		syncWindowExclusions,
		isValidUrlPattern
	} from '$lib/stores';
	import type { FilterAction, TabLimiterConfig } from '$lib/types';

	let newFilter = '';
	let newRuleAction: FilterAction = 'count';
	let filterError = '';
	let limitError = '';
	const limits = [
		{ key: 'maxTabs', label: 'Total tabs' },
		{ key: 'maxWindowTabs', label: 'Per window' },
		{ key: 'maxWindows', label: 'Windows' }
	] as const;
	const windowTypes = [
		{ label: 'Popup', tabs: 'excludePopupForTabs', windows: 'excludePopupForWindows' },
		{
			label: 'Developer tools',
			tabs: 'excludeDevtoolsForTabs',
			windows: 'excludeDevtoolsForWindows'
		},
		{ label: 'Panel', tabs: 'excludePanelForTabs', windows: 'excludePanelForWindows' },
		{ label: 'App', tabs: 'excludeAppForTabs', windows: 'excludeAppForWindows' }
	] as const;

	async function changeLimit(field: 'maxTabs' | 'maxWindowTabs' | 'maxWindows', value: string) {
		const number = Number(value);
		if (!Number.isSafeInteger(number) || number <= 0) {
			limitError = 'Enter a whole number greater than zero.';
			return;
		}
		limitError = '';
		await updateConfig({ [field]: number });
	}
	function changeExclusion(field: keyof TabLimiterConfig, checked: boolean) {
		return updateConfig(syncWindowExclusions({ ...$config, [field]: checked }));
	}
	async function addRule() {
		const pattern = newFilter.trim();
		if (!isValidUrlPattern(pattern)) {
			filterError = 'Enter a site or URL pattern, such as example.com.';
			return;
		}
		if (
			$config.filterRules.some((rule) => rule.pattern === pattern && rule.action === newRuleAction)
		) {
			filterError = 'This rule already exists.';
			return;
		}
		if (
			await updateConfig({
				filterRules: [...$config.filterRules, { pattern, action: newRuleAction, enabled: true }]
			})
		) {
			newFilter = '';
			filterError = '';
		}
	}
	function toggleRule(index: number) {
		return updateConfig({
			filterRules: $config.filterRules.map((rule, i) =>
				i === index ? { ...rule, enabled: rule.enabled === false } : rule
			)
		});
	}
	function changeRuleAction(index: number) {
		return updateConfig({
			filterRules: $config.filterRules.map((rule, i) =>
				i === index
					? { ...rule, action: rule.action === 'count' ? 'ignore' : ('count' as FilterAction) }
					: rule
			)
		});
	}
	function removeRule(index: number) {
		return updateConfig({ filterRules: $config.filterRules.filter((_, i) => i !== index) });
	}
	async function handleReset() {
		if (confirm('Reset all limits, site rules, and window exclusions to their defaults?'))
			await resetConfig();
	}
</script>

<div class="settings-stack">
	<div class="section-heading">
		<h2>Your preferences</h2>
		<span class="save-indicator" role="status"
			>{$saveState === 'saving'
				? 'Saving…'
				: $saveState === 'saved'
					? '✓ Saved'
					: 'Auto-saves'}</span
		>
	</div>

	<section class="settings-section">
		<h3>Limits</h3>
		<p class="section-description">Set how much room you want for browsing.</p>
		<div class="limits-grid">
			{#each limits as limit}
				<label class="field" for={limit.key}>
					<span>{limit.label}</span>
					<input
						id={limit.key}
						type="number"
						min="1"
						step="1"
						value={$config[limit.key]}
						disabled={$saveState === 'saving'}
						aria-describedby={limitError ? 'limit-error' : undefined}
						on:blur={(event) => changeLimit(limit.key, event.currentTarget.value)}
					/>
				</label>
			{/each}
		</div>
		{#if limitError}<p id="limit-error" class="field-error" role="alert">{limitError}</p>{/if}
	</section>

	<section class="settings-section">
		<h3>Sites &amp; rules</h3>
		<p class="section-description">Choose which sites use your tab allowance.</p>
		<div class="default-action-row">
			<label for="default-action">When no rule matches</label>
			<select
				id="default-action"
				value={$config.filterDefaultAction}
				disabled={$saveState === 'saving'}
				on:change={(event) =>
					updateConfig({
						filterDefaultAction: event.currentTarget.value === 'count' ? 'count' : 'ignore'
					})}
			>
				<option value="ignore">Ignore site</option><option value="count">Count site</option>
			</select>
		</div>
		<form class="rule-composer" on:submit|preventDefault={addRule}>
			<label class="field" for="new-rule"
				><span>Site or URL pattern</span>
				<input
					id="new-rule"
					type="text"
					placeholder="example.com or *.example.com"
					bind:value={newFilter}
					on:input={() => (filterError = '')}
					spellcheck="false"
					autocapitalize="off"
					aria-invalid={filterError ? 'true' : undefined}
					aria-describedby={filterError ? 'rule-help rule-error' : 'rule-help'}
				/>
			</label>
			<div class="rule-actions">
				<div class="segmented" role="group" aria-label="Action for new rule">
					<button
						type="button"
						class:selected={newRuleAction === 'count'}
						aria-pressed={newRuleAction === 'count'}
						on:click={() => (newRuleAction = 'count')}>Count</button
					>
					<button
						type="button"
						class:selected={newRuleAction === 'ignore'}
						aria-pressed={newRuleAction === 'ignore'}
						on:click={() => (newRuleAction = 'ignore')}>Ignore</button
					>
				</div>
				<button type="submit" class="primary-button" disabled={$saveState === 'saving'}
					><span aria-hidden="true">+</span> Add rule</button
				>
			</div>
			<p id="rule-help" class="helper">
				Domains match any protocol and path. First matching rule wins.
			</p>
			{#if filterError}<p id="rule-error" class="field-error" role="alert">{filterError}</p>{/if}
		</form>

		<div class="section-heading rule-list-heading">
			<h4>Rules</h4>
			<span class="subtle">{$config.filterRules.length}</span>
		</div>
		<div class="rules-list">
			{#each $config.filterRules as rule, index}
				<div class="rule-row" class:rule-disabled={rule.enabled === false}>
					<label class="rule-enabled">
						<input
							type="checkbox"
							checked={rule.enabled !== false}
							disabled={$saveState === 'saving'}
							aria-label={'Enable rule for ' + rule.pattern}
							on:change={() => toggleRule(index)}
						/>
					</label>
					<code title={rule.pattern}>{rule.pattern}</code>
					<button
						class="rule-action"
						disabled={$saveState === 'saving'}
						aria-label={'Change action for ' + rule.pattern + ': currently ' + rule.action}
						on:click={() => changeRuleAction(index)}
						>{rule.action === 'count' ? 'Count' : 'Ignore'}</button
					>
					<button
						class="icon-button"
						disabled={$saveState === 'saving'}
						aria-label={'Remove rule for ' + rule.pattern}
						on:click={() => removeRule(index)}>×</button
					>
				</div>
			{:else}
				<p class="empty-state">No rules yet. Add your first site above.</p>
			{/each}
		</div>
	</section>

	<details class="settings-section disclosure">
		<summary>Window exclusions<span class="subtle">Advanced</span></summary>
		<p class="section-description">Leave these window types out of your counts.</p>
		<table class="exclusion-table">
			<thead
				><tr
					><th scope="col">Window type</th><th scope="col">Skip tabs</th><th scope="col"
						>Skip window</th
					></tr
				></thead
			>
			<tbody
				>{#each windowTypes as type}
					<tr
						><th scope="row">{type.label}</th>
						<td
							><input
								type="checkbox"
								aria-label={'Exclude ' + type.label + ' tabs'}
								checked={Boolean($config[type.tabs])}
								disabled={$saveState === 'saving'}
								on:change={(event) => changeExclusion(type.tabs, event.currentTarget.checked)}
							/></td
						>
						<td
							><input
								type="checkbox"
								aria-label={'Exclude ' + type.label + ' windows'}
								checked={Boolean($config[type.windows])}
								disabled={$saveState === 'saving'}
								on:change={(event) => changeExclusion(type.windows, event.currentTarget.checked)}
							/></td
						>
					</tr>
				{/each}</tbody
			>
		</table>
	</details>

	<details class="settings-section disclosure">
		<summary>How limiting works</summary>
		<p class="section-description">
			New tabs that exceed your limits are closed. Lowering a limit does not close tabs you already
			have open.
		</p>
		<p class="helper">Newly opened tabs may be checked again while their first page loads.</p>
	</details>

	<div class="settings-footer">
		<span class="subtle">Make space for what matters.</span><button
			class="text-button reset-button"
			disabled={$saveState === 'saving'}
			on:click={handleReset}>Reset defaults</button
		>
	</div>
</div>
