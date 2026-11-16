// categoryTypes.ts — types and helpers for the category explorer.
import type { ColumnGroup } from './paperTypes';
import { getValue } from './paperTypes';
import type { Paper } from './paperTypes';

/** A single value within a dimension. */
export interface CategoryValue {
	value: string;
	summary: string;
}

/** A taxonomy dimension with its values. */
export interface CategoryDimension {
	id: string;
	label: string;
	group: ColumnGroup;
	description: string;
	values: CategoryValue[];
}

/** A category group (one subpage of the category explorer). */
export interface CategoryGroup {
	id: ColumnGroup;
	label: string;
	description: string;
	color: string;
	bg: string;
}

/** The three category groups and their distinct colors. */
export const CATEGORY_GROUPS: CategoryGroup[] = [
	{
		id: 'ml_task',
		label: 'ML Tasks',
		description:
			'The general machine-learning task properties of the reviewed studies. This covers whether a study is method- or application-oriented, the application domain it targets, the data modality it operates on, the ML problem class it addresses, and the intended audience of the explanations.',
		color: 'var(--color-teal-700)',
		bg: 'var(--color-teal-100)',
	},
	{
		id: 'xuq_method',
		label: 'XUQ Methods',
		description:
			'The uncertainty-quantification and explanation methods used in the reviewed studies. This covers the type of uncertainty explained, the UQ method used to generate the uncertainty estimate, the specific uncertainty estimate, how the explanation is integrated with the model, its portability, its locality, and the form the explanation takes.',
		color: 'var(--color-navy-600)',
		bg: 'var(--color-navy-100)',
	},
	{
		id: 'xuq_evaluation',
		label: 'XUQ Evaluation',
		description:
			'How the reviewed studies evaluated their explanations of uncertainty. This covers whether the explanations were evaluated, the type of evaluation performed (functionally-grounded, human-grounded, or visual inspection), the Co-12 quality properties addressed, whether the method was benchmarked against others, and whether SHAP was used.',
		color: 'var(--color-teal-600)',
		bg: 'var(--color-teal-50)',
	},
];

/** Get the group definition for a column group id. */
export function getCategoryGroup(groupId: ColumnGroup): CategoryGroup {
	return CATEGORY_GROUPS.find((g) => g.id === groupId) ?? CATEGORY_GROUPS[0];
}

/** The full categories data file. */
export interface CategoriesData {
	intro: string;
	dimensions: CategoryDimension[];
}

/** A paper reference with enough info to display a link. */
export interface PaperRef {
	id: string;
	title: string;
	authors: string[];
	year: number | null;
	venue: string;
	doi: string;
}

/**
 * Compute the papers that contain a given value in a given dimension.
 * The dimension id maps to a path in the Paper object.
 */
export function papersForValue(
	papers: Paper[],
	dimensionId: string,
	value: string
): PaperRef[] {
	// Map dimension id -> path in the Paper object.
	const pathMap: Record<string, string> = {
		research_type: 'general.research_type',
		application_domain: 'general.application_domain',
		data_modality: 'general.data_modality',
		ml_task: 'general.ml_task',
		audience: 'general.audience',
		uncertainty_type: 'xuq_method.uncertainty_type',
		uq_method: 'xuq_method.uq_method',
		uncertainty_estimate: 'xuq_method.uncertainty_estimate',
		integration_type: 'xuq_method.integration_type',
		portability: 'xuq_method.portability',
		locality: 'xuq_method.locality',
		explanation_output_type: 'xuq_method.explanation_output_type',
		evaluated: 'xuq_evaluation.evaluated',
		evaluation_type: 'xuq_evaluation.evaluation_type',
		co12: 'xuq_evaluation.co12',
		benchmarked: 'xuq_evaluation.benchmarked',
		shap: 'xuq_evaluation.shap',
	};
	const path = pathMap[dimensionId];
	if (!path) return [];

	return papers
		.filter((p) => {
			const val = getValue(p, path);
			if (Array.isArray(val)) return val.map(String).includes(value);
			return String(val) === value;
		})
		.map((p) => ({
			id: p.id,
			title: p.title,
			authors: p.authors,
			year: p.year,
			venue: p.venue,
			doi: p.doi,
		}));
}

/** Humanize a snake_case / spaced label. */
export function humanizeLabel(s: string): string {
	return s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}