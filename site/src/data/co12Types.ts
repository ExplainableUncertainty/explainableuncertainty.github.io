// co12Types.ts — types for the Co-12 properties data.

/** A single Co-12 property. */
export interface Co12Value {
	value: string;
	description: string;
	keyIdea: string;
}

/** A Co-12 dimension (Content, Presentation, or User). */
export interface Co12Dimension {
	id: string;
	label: string;
	description: string;
	color: string;
	bg: string;
	values: Co12Value[];
}

/** The full Co-12 data file. */
export interface Co12Data {
	intro: string;
	dimensions: Co12Dimension[];
}