<script lang="ts">
	export let label: string;
	export let value: number;
	export let limit: number;
	export let compact = false;
	$: percentage = Math.max(0, Math.min(100, (value / Math.max(1, limit)) * 100));
	$: state =
		value > limit ? 'over' : value >= limit ? 'full' : percentage >= 80 ? 'near' : 'normal';
	$: description =
		value > limit
			? value - limit + ' over limit'
			: value === limit
				? 'At limit'
				: limit - value + ' remaining';
</script>

<div class:metric={!compact} class="usage-meter" data-state={state}>
	{#if !compact}
		<p class="metric-label">{label}</p>
		<p class="metric-value">{value}<span> / {limit}</span></p>
	{/if}
	<div
		class="meter-track"
		role="meter"
		aria-label={label}
		aria-valuemin="0"
		aria-valuemax={limit}
		aria-valuenow={Math.min(value, limit)}
		aria-valuetext={value + ' of ' + limit + '. ' + description}
	>
		<div class="meter-fill" style:width={percentage + '%'}></div>
	</div>
	{#if !compact}<p class="metric-caption">{description}</p>{/if}
</div>
