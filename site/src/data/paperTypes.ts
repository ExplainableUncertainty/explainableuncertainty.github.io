// paperTypes.ts — TypeScript types for the paper explorer data and column config.

/** A single reviewed paper, merged from the CSV + BibTeX. */
export interface Paper {
	id: string;
	year: number | null;
	title: string;
	authors: string[];
	doi: string;
	url: string;
	venue: string;
	abstract: string;
	general: {
		research_type: string[];
		application_domain: string[];
		data_modality: string[];
		ml_task: string[];
		audience: string[];
	};
	xuq_method: {
		uncertainty_type: string[];
		uq_method: string[];
		uncertainty_estimate: string[];
		integration_type: string[];
		portability: string[];
		locality: string[];
		explanation_output_type: string[];
	};
	xuq_evaluation: {
		evaluated: string[];
		evaluation_type: string[];
		co12: string[];
		benchmarked: string[];
		attribution_detail: string[];
	};
}

/** The three (plus general) overarching column groups. */
export type ColumnGroup = 'general' | 'ml_task' | 'xuq_method' | 'xuq_evaluation';

/** A single table column definition. */
export interface ColumnDef {
	/** Unique key used to read the value from a Paper. */
	key: string;
	/** Human-readable header. */
	label: string;
	/** Which group this column belongs to. */
	group: ColumnGroup;
	/** Path into the Paper object (dot-separated) to read the value. */
	path: string;
	/** Whether the value is a list of labels (vs a scalar). */
	isList: boolean;
	/** Optional: always shown regardless of group filter. */
	always?: boolean;
}

/** Group metadata: label + color theme. */
export interface GroupDef {
	id: ColumnGroup;
	label: string;
	/** CSS color token used for the group header / filter chip. */
	color: string;
	/** Background tint for the group header. */
	bg: string;
}

/** The column groups and their colors. */
export const GROUPS: GroupDef[] = [
	{ id: 'general', label: 'General', color: 'var(--color-gray-600)', bg: 'var(--color-gray-100)' },
	{ id: 'ml_task', label: 'Research Context', color: 'var(--color-navy-500)', bg: 'var(--color-navy-100)' },
	{ id: 'xuq_method', label: 'XUQ Method', color: 'var(--color-indigo-700)', bg: 'var(--color-indigo-100)' },
	{ id: 'xuq_evaluation', label: 'XUQ Evaluation', color: 'var(--color-teal-700)', bg: 'var(--color-teal-100)' },
];

/** The three category tables shown in the paper explorer (general is always shown). */
export const TABLE_GROUPS: ColumnGroup[] = ['ml_task', 'xuq_method', 'xuq_evaluation'];

/** Get the columns for a given table: the general columns + that group's columns. */
export function getTableColumns(group: ColumnGroup): ColumnDef[] {
	return COLUMNS.filter((c) => c.group === 'general' || c.group === group);
}

/** The full column configuration. Easy to add/remove columns here. */
export const COLUMNS: ColumnDef[] = [
	// ---- General (always shown) ----
	{ key: 'id', label: 'ID', group: 'general', path: 'id', isList: false, always: true },
	{ key: 'title', label: 'Title', group: 'general', path: 'title', isList: false, always: true },
	{ key: 'authors', label: 'Authors', group: 'general', path: 'authors', isList: true, always: true },
	{ key: 'year', label: 'Year', group: 'general', path: 'year', isList: false, always: true },
	{ key: 'doi', label: 'DOI', group: 'general', path: 'doi', isList: false, always: true },
	{ key: 'venue', label: 'Venue', group: 'general', path: 'venue', isList: false, always: true },

	// ---- ML Task Properties ----
	{ key: 'research_type', label: 'Research Type', group: 'ml_task', path: 'general.research_type', isList: true },
	{ key: 'application_domain', label: 'Application Domain', group: 'ml_task', path: 'general.application_domain', isList: true },
	{ key: 'data_modality', label: 'Data Modality', group: 'ml_task', path: 'general.data_modality', isList: true },
	{ key: 'ml_task', label: 'ML Task', group: 'ml_task', path: 'general.ml_task', isList: true },
	{ key: 'audience', label: 'Audience', group: 'ml_task', path: 'general.audience', isList: true },

	// ---- XUQ Method ----
	{ key: 'uncertainty_type', label: 'Uncertainty Type', group: 'xuq_method', path: 'xuq_method.uncertainty_type', isList: true },
	{ key: 'uq_method', label: 'UQ Method', group: 'xuq_method', path: 'xuq_method.uq_method', isList: true },
	{ key: 'uncertainty_estimate', label: 'Uncertainty Estimate', group: 'xuq_method', path: 'xuq_method.uncertainty_estimate', isList: true },
	{ key: 'integration_type', label: 'Integration Type', group: 'xuq_method', path: 'xuq_method.integration_type', isList: true },
	{ key: 'portability', label: 'Portability', group: 'xuq_method', path: 'xuq_method.portability', isList: true },
	{ key: 'locality', label: 'Locality', group: 'xuq_method', path: 'xuq_method.locality', isList: true },
	{ key: 'explanation_output_type', label: 'Explanation Output', group: 'xuq_method', path: 'xuq_method.explanation_output_type', isList: true },

	// ---- XUQ Evaluation ----
	{ key: 'evaluated', label: 'Evaluation conducted?', group: 'xuq_evaluation', path: 'xuq_evaluation.evaluated', isList: true },
	{ key: 'evaluation_type', label: 'Evaluation Type', group: 'xuq_evaluation', path: 'xuq_evaluation.evaluation_type', isList: true },
	{ key: 'co12', label: 'Co-12 Properties', group: 'xuq_evaluation', path: 'xuq_evaluation.co12', isList: true },
	{ key: 'benchmarked', label: 'Benchmarked', group: 'xuq_evaluation', path: 'xuq_evaluation.benchmarked', isList: true },
	{ key: 'attribution_detail', label: 'Attribution Detail', group: 'xuq_evaluation', path: 'xuq_evaluation.attribution_detail', isList: true },
];

/** Read a value from a Paper object by a dot-separated path. */
export function getValue(paper: Paper, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, key) => {
		if (acc && typeof acc === 'object') {
			return (acc as Record<string, unknown>)[key];
		}
		return undefined;
	}, paper);
}

/** Format a value for display in a table cell. */
export function formatValue(value: unknown): string {
	if (value === null || value === undefined || value === '') return '—';
	if (Array.isArray(value)) {
		if (value.length === 0) return '—';
		return value.join(', ');
	}
	return String(value);
}

/** Humanize a snake_case / spaced label (e.g. 'model_agnostic' -> 'Model agnostic'). */
export function humanize(label: string): string {
	return label
		.replace(/_/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Get the group definition for a column group id. */
export function getGroup(groupId: ColumnGroup): GroupDef {
	return GROUPS.find((g) => g.id === groupId) ?? GROUPS[0];
}

/**
 * Assign a label color for a given group. Each group has its own hue so that
 * all labels within a column group share the same color family.
 */
export function labelColor(groupId: ColumnGroup): string {
	switch (groupId) {
		case 'ml_task':
			return 'var(--color-navy-600)';
		case 'xuq_method':
			return 'var(--color-indigo-700)';
		case 'xuq_evaluation':
			return 'var(--color-teal-700)';
		case 'general':
		default:
			return 'var(--color-gray-600)';
	}
}

/** Background tint for a label of a given group. */
export function labelBg(groupId: ColumnGroup): string {
	switch (groupId) {
		case 'ml_task':
			return 'var(--color-navy-100)';
		case 'xuq_method':
			return 'var(--color-indigo-100)';
		case 'xuq_evaluation':
			return 'var(--color-teal-100)';
		case 'general':
		default:
			return 'var(--color-gray-100)';
	}
}