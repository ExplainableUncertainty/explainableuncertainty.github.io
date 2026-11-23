/**
 * valueLabels.ts — curated display labels for taxonomy values.
 *
 * Generated from the `label` fields in categories.json (values without a
 * curated label fall back to humanizeLabel). Keeping this as a module lets
 * both the server-rendered tables and the client scripts use identical
 * casing without shipping all of categories.json to the browser.
 */

export const VALUE_LABELS: Record<string, string> = {
	"application_oriented": "Application-oriented",
	"method_oriented": "Method-oriented",
	"image": "Image",
	"tabular": "Tabular",
	"time series": "Time series",
	"text": "Text",
	"graph": "Graph",
	"structured spatiotemporal data": "Structured spatiotemporal data",
	"multimodal": "Multimodal",
	"event data": "Event data",
	"classification": "Classification",
	"regression": "Regression",
	"time series forecasting": "Time series forecasting",
	"trajectory prediction": "Trajectory prediction",
	"segmentation": "Segmentation",
	"object detection": "Object detection",
	"predictive": "Predictive",
	"epistemic": "Epistemic",
	"aleatoric": "Aleatoric",
	"other": "Other",
	"Not specified": "Not specified",
	"model_agnostic": "Model-agnostic",
	"model_specific": "Model-specific",
	"local": "Local",
	"global": "Global",
	"both": "Both",
	"uncertainty attribution": "Uncertainty attribution",
};

/** Display label for a raw taxonomy value. */
export function valueLabel(value: string): string {
	return VALUE_LABELS[value] ?? value;
}
