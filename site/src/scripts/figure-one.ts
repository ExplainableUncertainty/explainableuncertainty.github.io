/**
 * figure-one.ts — connector engine for the FigureOne.astro diagram.
 *
 * The figure recreates the paper's Figure 1 ("Two ways of combining
 * Explainable AI and Uncertainty Quantification"). Node positions depend on
 * text and viewport size, so instead of hard-coding wire geometry we measure
 * the actual DOM nodes and draw the connectors onto an SVG overlay:
 *
 *   Black box ──▶ Prediction
 *                 ▲ dashed  (label: "quantifies uncertainty of")
 *                 │         → Uncertainty estimate  [XUQ panel, above]
 *                 ▼ dashed  (label: "explains")
 *                 │         ← Explanation  [UAXAI panel, below]
 *
 * The paradigm wires are vertical (top/bottom edge anchors), matching the
 * paper; the grid keeps the Prediction node column-aligned with the first
 * node of each panel flow so the wires stay straight. Below the wide-layout
 * breakpoint the overlay is hidden via CSS (panels stack and the vertical
 * wires would cross panel content); the in-panel arrows still show the flow.
 *
 * Also wires up the interactivity: hovering a paradigm (or toggling its cloud
 * badge) dims the other paradigm and recolors its wires.
 */

/** A paradigm (panel) key. */
type Paradigm = 'xuq' | 'uaxai';

/** Named anchors in the diagram; each maps to an element with `data-fig1-node`. */
type NodeKey = 'blackbox' | 'prediction' | 'xuq-estimate' | 'uaxai-explanation';

/** Wire orientation: horizontal (right→left edges) or vertical (bottom→top edges). */
type Orientation = 'horizontal' | 'vertical';

/** Padding between a wire endpoint and the edge of its target node (px). */
const ENDPOINT_GAP = 4;

/** Horizontal distance between a vertical wire and its rotated label (px). */
const LABEL_OFFSET = 8;

/** Query selector for a diagram node anchor. */
const nodeSelector = (key: NodeKey): string => `[data-fig1-node="${key}"]`;

/** Query selector for a connector wire path. */
const wireSelector = (key: Paradigm | 'source'): string => `[data-wire="${key}"]`;

/** Query selector for a floating wire label. */
const wireLabelSelector = (key: Paradigm): string => `[data-wire-label="${key}"]`;

/**
 * Compute the anchor points and SVG path for a connector between two elements.
 *
 * - `horizontal`: leaves the source's right edge, enters the target's left edge.
 * - `vertical`: leaves the source's top edge, enters the target's bottom edge
 *   (upward arrow, as in the paper).
 *
 * All coordinates are relative to the overlay's top-left corner.
 */
function computeWire(
	fromEl: Element,
	toEl: Element,
	overlay: SVGGraphicsElement,
	orientation: Orientation,
): { d: string; midX: number; midY: number } | null {
	const fromBox = fromEl.getBoundingClientRect();
	const toBox = toEl.getBoundingClientRect();
	const overlayBox = overlay.getBoundingClientRect();
	// Overlay hidden (narrow layout) — nothing to draw.
	if (overlayBox.width === 0 || fromBox.width === 0 || toBox.width === 0) return null;

	if (orientation === 'horizontal') {
		const x1 = fromBox.right - overlayBox.left;
		const y1 = fromBox.top + fromBox.height / 2 - overlayBox.top;
		const x2 = toBox.left - overlayBox.left - ENDPOINT_GAP;
		const y2 = toBox.top + toBox.height / 2 - overlayBox.top;
		return { d: `M ${x1} ${y1} L ${x2} ${y2}`, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 };
	}

	const x1 = fromBox.left + fromBox.width / 2 - overlayBox.left;
	const y1 = fromBox.top - overlayBox.top - ENDPOINT_GAP;
	const x2 = toBox.left + toBox.width / 2 - overlayBox.left;
	const y2 = toBox.bottom - overlayBox.top;
	return { d: `M ${x1} ${y1} L ${x2} ${y2}`, midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 };
}

/**
 * Place a wire label alongside a vertical wire, rotated to read bottom-to-top
 * (as in the paper figure). `x`/`y` anchor the text just left of the wire.
 */
function placeVerticalLabel(label: SVGTextElement, midX: number, midY: number): void {
	const x = midX - LABEL_OFFSET;
	const y = midY;
	label.setAttribute('x', String(x));
	label.setAttribute('y', String(y));
	label.setAttribute('transform', `rotate(-90 ${x} ${y})`);
}

/**
 * Initialise the interactive Figure 1 diagram.
 * Idempotent: safe to call multiple times for the same figure.
 */
export function initFigureOne(figure: HTMLElement): void {
	if (figure.dataset.fig1Ready === 'true') return;
	figure.dataset.fig1Ready = 'true';

	const canvas = figure.querySelector<HTMLElement>('[data-fig1-canvas]');
	const overlay = figure.querySelector<SVGGraphicsElement>('[data-fig1-wires]');
	if (!canvas || !overlay) return;

	const nodes = {
		blackbox: figure.querySelector(nodeSelector('blackbox')),
		prediction: figure.querySelector(nodeSelector('prediction')),
		xuqEstimate: figure.querySelector(nodeSelector('xuq-estimate')),
		uaxaiExplanation: figure.querySelector(nodeSelector('uaxai-explanation')),
	} as Record<NodeKey, Element | null>;

	const wires = {
		source: figure.querySelector<SVGPathElement>(wireSelector('source')),
		xuq: figure.querySelector<SVGPathElement>(wireSelector('xuq')),
		uaxai: figure.querySelector<SVGPathElement>(wireSelector('uaxai')),
	};

	const labels = {
		xuq: figure.querySelector<SVGTextElement>(wireLabelSelector('xuq')),
		uaxai: figure.querySelector<SVGTextElement>(wireLabelSelector('uaxai')),
	};

	/** Redraw all connector wires from the current node positions. */
	function drawWires(): void {
		if (!overlay) return;

		// Black box → Prediction (solid, horizontal).
		const source =
			nodes.blackbox &&
			nodes.prediction &&
			wires.source &&
			computeWire(nodes.blackbox, nodes.prediction, overlay, 'horizontal');
		if (source && wires.source) {
			wires.source.setAttribute('d', source.d);
		}

		// XUQ wire: Prediction → Uncertainty estimate (panel above; upward arrow).
		const xuq =
			nodes.prediction &&
			nodes.xuqEstimate &&
			wires.xuq &&
			computeWire(nodes.prediction, nodes.xuqEstimate, overlay, 'vertical');
		if (xuq && wires.xuq) {
			wires.xuq.setAttribute('d', xuq.d);
			if (labels.xuq) placeVerticalLabel(labels.xuq, xuq.midX, xuq.midY);
		}

		// UAXAI wire: Explanation → Prediction (panel below; upward arrow).
		const uaxai =
			nodes.uaxaiExplanation &&
			nodes.prediction &&
			wires.uaxai &&
			computeWire(nodes.uaxaiExplanation, nodes.prediction, overlay, 'vertical');
		if (uaxai && wires.uaxai) {
			wires.uaxai.setAttribute('d', uaxai.d);
			if (labels.uaxai) placeVerticalLabel(labels.uaxai, uaxai.midX, uaxai.midY);
		}
	}

	/** Apply (or clear) the highlighted-paradigm state on the figure root. */
	function setHot(paradigm: Paradigm | null): void {
		if (paradigm) {
			figure.setAttribute('data-hot', paradigm);
		} else {
			figure.removeAttribute('data-hot');
		}
		// Recolor the wires of the inspected paradigm.
		for (const key of ['xuq', 'uaxai'] as const) {
			wires[key]?.classList.toggle('is-hot', paradigm === key);
		}
	}

	// --- Hover tracing -------------------------------------------------------
	for (const panel of figure.querySelectorAll<HTMLElement>('[data-fig1-panel]')) {
		const paradigm = panel.dataset.fig1Panel as Paradigm | undefined;
		if (!paradigm) continue;
		panel.addEventListener('mouseenter', () => setHot(paradigm));
		panel.addEventListener('mouseleave', () => setHot(null));
		panel.addEventListener('focusin', () => setHot(paradigm));
		panel.addEventListener('focusout', () => setHot(null));
	}

	// --- Cloud badge toggles (persistent highlight) ---------------------------
	for (const button of figure.querySelectorAll<HTMLButtonElement>('[data-fig1-focus]')) {
		const paradigm = button.dataset.fig1Focus as Paradigm | undefined;
		if (!paradigm) continue;
		button.addEventListener('click', () => {
			const isActive = figure.getAttribute('data-focus') === paradigm;
			// Toggle off if the same badge is clicked again.
			const next = isActive ? null : paradigm;
			if (next) {
				figure.setAttribute('data-focus', next);
			} else {
				figure.removeAttribute('data-focus');
			}
			for (const other of figure.querySelectorAll<HTMLButtonElement>('[data-fig1-focus]')) {
				other.setAttribute('aria-pressed', String(other === button && next !== null));
			}
		});
	}

	// --- Keep the wires attached across viewport changes ----------------------
	let frame = 0;
	const scheduleDraw = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(drawWires);
	};

	if ('ResizeObserver' in window) {
		const observer = new ResizeObserver(scheduleDraw);
		observer.observe(canvas);
		for (const node of Object.values(nodes)) {
			if (node instanceof HTMLElement) observer.observe(node);
		}
	}
	window.addEventListener('resize', scheduleDraw);
	// Web fonts can change node sizes after first paint.
	document.fonts?.ready.then(scheduleDraw).catch(() => undefined);

	drawWires();
}
