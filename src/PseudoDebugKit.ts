import { defaultCSS } from "./style";
import type { DebugOptions } from "./types";

export class PseudoDebugKit {
	private opts: DebugOptions;
	private root?: HTMLElement;
	private styleEl?: HTMLStyleElement;
	private gridEl?: HTMLElement;
	private toolbarEl?: HTMLElement;
	private state = { wire: false, grid: false, tags: false, highlight: false, styleInfo: false };

	private overlayRoot?: HTMLDivElement;
	private overlayContent?: HTMLDivElement;
	private overlayPadding?: HTMLDivElement;
	private overlayMargin?: HTMLDivElement;

	private stylePanel?: HTMLDivElement;
	private shortcutCleanup?: () => void;

	private styleCache: WeakMap<HTMLElement, CSSStyleDeclaration> = new WeakMap();
	private parsedValuesCache: WeakMap<CSSStyleDeclaration, Map<string, number>> = new WeakMap();

	constructor(options?: DebugOptions) {
		this.opts = { gridColumns: 12, accent: "#ff6b6b", panel: false, shortcuts: false, prefix: "pdk-", ...(options || {}) };
	}

	public init(root: HTMLElement = document.body) {
		if (this.root) return;
		this.root = root;
		this.injectStyle();
		this.buildUI();
		this.buildHighlightOverlay();
		this.buildStylePanel();
		if (this.opts.shortcuts) {
			this.shortcutCleanup = this.bindShortcuts();
		}
	}

	private markInternal(el: HTMLElement) {
		el.setAttribute(`data-${this.opts.prefix}internal`, "1");
	}
	private isInternal(el: Node) {
		return el instanceof HTMLElement && el.hasAttribute(`data-${this.opts.prefix}internal`);
	}

	private injectStyle() {
		this.styleEl = document.createElement("style");
		this.styleEl.setAttribute(`data-pseudo-debugkit-style`, "");
		this.styleEl.textContent = defaultCSS(this.opts.accent, this.opts.prefix);
		document.head.appendChild(this.styleEl);
	}

	private buildUI() {
		if (!this.opts.panel) return;

		this.buildToolbar();
		this.buildGrid();
	}

	private buildToolbar() {
		this.toolbarEl = document.createElement("div");
		this.toolbarEl.id = `${this.opts.prefix}dbg-toolbar`;
		this.markInternal(this.toolbarEl);

		const modes: Array<[keyof typeof this.state, string]> = [
			["wire", "Wireframe"],
			["highlight", "Highlight"],
			["styleInfo", "Style Info"],
			["tags", "Tags"],
			["grid", "Grid"],
		];
		for (const [mode, label] of modes) {
			const btn = document.createElement("button");
			btn.dataset.mode = mode;
			btn.textContent = label;
			this.markInternal(btn);
			btn.addEventListener("click", () => this.toggleMode(mode, btn));
			this.toolbarEl.appendChild(btn);
		}
		document.body.appendChild(this.toolbarEl);
	}

	private buildGrid() {
		this.gridEl = document.createElement("div");
		this.gridEl.id = `${this.opts.prefix}dbg-grid`;
		this.markInternal(this.gridEl);

		const cols = document.createElement("div");
		cols.className = `${this.opts.prefix}cols`;
		this.markInternal(cols);
		this.gridEl.appendChild(cols);

		document.body.appendChild(this.gridEl);
		this.setGridColumns(this.opts.gridColumns || 12);
	}

	private setGridColumns(n: number) {
		if (!this.gridEl) return;
		const cols = this.gridEl.querySelector(`.${this.opts.prefix}cols`) as HTMLElement | null;
		if (!cols) return;

		while (cols.firstChild) cols.removeChild(cols.firstChild);
		for (let i = 0; i < n; i++) {
			const c = document.createElement("div");
			c.className = `${this.opts.prefix}col`;
			this.markInternal(c);
			cols.appendChild(c);
		}
	}

	public enable() {
		this.show(true);
	}
	public disable() {
		this.show(false);
	}
	public toggle() {
		this.show(!this.isEnabled());
	}
	public isEnabled() {
		return !!this.root;
	}

	public setWire(on: boolean) {
		this.applyWire(on);
	}

	public setGrid(on: boolean) {
		this.applyGrid(on);
	}

	public setTags(on: boolean) {
		this.applyTags(on);
	}

	public setHighlight(on: boolean) {
		this.state.highlight = on;
	}

	public setStyleInfo(on: boolean) {
		this.state.styleInfo = on;
	}

	// ----- 状態取得用（オプション） -----
	public getState() {
		return { ...this.state };
	}

	private show(on: boolean) {
		if (!this.root) return;
		if (this.toolbarEl) this.toolbarEl.style.display = on ? "flex" : "none";
		if (this.gridEl) this.gridEl.style.display = on && this.state.grid ? "block" : "none";
	}

	public destroy() {
		const elements = [this.styleEl, this.toolbarEl, this.gridEl, this.overlayRoot, this.stylePanel];
		for (const el of elements) {
			el?.remove();
		}
		this.shortcutCleanup?.();
		this.root = undefined;
	}

	private buildHighlightOverlay() {
		const prefix = this.opts.prefix;

		this.overlayRoot = document.createElement("div");
		this.overlayRoot.id = `${prefix}dbg-hover-overlay`;
		this.markInternal(this.overlayRoot);

		const content = document.createElement("div");
		const padding = document.createElement("div");
		const margin = document.createElement("div");

		content.id = `${prefix}dbg-hover-content`;
		padding.id = `${prefix}dbg-hover-padding`;
		margin.id = `${prefix}dbg-hover-margin`;

		this.markInternal(content);
		this.markInternal(padding);
		this.markInternal(margin);

		this.overlayRoot.appendChild(margin);
		this.overlayRoot.appendChild(padding);
		this.overlayRoot.appendChild(content);

		this.overlayContent = content;
		this.overlayPadding = padding;
		this.overlayMargin = margin;

		document.body.appendChild(this.overlayRoot);

		const debouncedUpdate = this.debounce((target: HTMLElement) => {
			if (!this.state.highlight && !this.state.styleInfo) return;

			if (!target || this.isInternal(target)) return;

			if (this.state.highlight) this.updateHighlight(target);
			if (this.state.styleInfo) this.updateStyleInfo(target);
		}, 10);

		const debouncedHide = this.debounce(() => {
			if (this.overlayRoot) this.overlayRoot.style.display = "none";
			if (this.stylePanel) this.stylePanel.style.display = "none";
		}, 10);

		document.addEventListener("mouseover", (e) => {
			debouncedUpdate(e.target as HTMLElement);
		});

		document.addEventListener("mouseout", (e) => {
			debouncedHide();
		});
	}

	private debounce<F extends (...args: any[]) => void>(func: F, waitFor: number) {
		let timeout: number;

		return (...args: Parameters<F>): void => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), waitFor);
		};
	}
	private getStyleCache(el: HTMLElement) {
		if (!this.styleCache.has(el)) {
			this.styleCache.set(el, getComputedStyle(el));
		}
		return this.styleCache.get(el)!;
	}

	private parseCSSValue(style: CSSStyleDeclaration, prop: string): number {
		if (!this.parsedValuesCache.has(style)) {
			this.parsedValuesCache.set(style, new Map());
		}
		const cache = this.parsedValuesCache.get(style)!;
		if (!cache.has(prop)) {
			cache.set(prop, parseFloat(style.getPropertyValue(prop)));
		}
		return cache.get(prop)!;
	}

	private updateHighlight(el: HTMLElement) {
		if (!this.overlayRoot) return;

		const rect = el.getBoundingClientRect();
		const style = this.getStyleCache(el);

		const pad = {
			top: this.parseCSSValue(style, "padding-top"),
			right: this.parseCSSValue(style, "padding-right"),
			bottom: this.parseCSSValue(style, "padding-bottom"),
			left: this.parseCSSValue(style, "padding-left"),
		};
		const mar = {
			top: this.parseCSSValue(style, "margin-top"),
			right: this.parseCSSValue(style, "margin-right"),
			bottom: this.parseCSSValue(style, "margin-bottom"),
			left: this.parseCSSValue(style, "margin-left"),
		};

		this.overlayRoot.style.display = "block";
		this.overlayRoot.style.top = this.px(rect.top - mar.top);
		this.overlayRoot.style.left = this.px(rect.left - mar.left);
		this.overlayRoot.style.width = this.px(rect.width + mar.left + mar.right);
		this.overlayRoot.style.height = this.px(rect.height + mar.top + mar.bottom);
		this.overlayRoot.style.overflow = "visible";

		this.overlayMargin!.style.top = "0px";
		this.overlayMargin!.style.left = "0px";
		this.overlayMargin!.style.width = "100%";
		this.overlayMargin!.style.height = "100%";

		this.overlayPadding!.style.top = this.px(mar.top);
		this.overlayPadding!.style.left = this.px(mar.left);
		this.overlayPadding!.style.width = this.px(rect.width);
		this.overlayPadding!.style.height = this.px(rect.height);

		this.overlayContent!.style.top = this.px(mar.top + pad.top);
		this.overlayContent!.style.left = this.px(mar.left + pad.left);
		this.overlayContent!.style.width = this.px(rect.width - pad.left - pad.right);
		this.overlayContent!.style.height = this.px(rect.height - pad.top - pad.bottom);
	}

	private buildStylePanel() {
		const prefix = this.opts.prefix;

		this.stylePanel = document.createElement("div");
		this.stylePanel.id = `${prefix}dbg-style-panel`;
		this.markInternal(this.stylePanel);
		this.stylePanel.style.position = "fixed";
		this.stylePanel.style.top = "12px";
		this.stylePanel.style.right = "12px";
		this.stylePanel.style.background = "rgba(0,0,0,0.75)";
		this.stylePanel.style.color = "#fff";
		this.stylePanel.style.fontSize = "12px";
		this.stylePanel.style.padding = "6px 8px";
		this.stylePanel.style.borderRadius = "6px";
		this.stylePanel.style.pointerEvents = "none";
		this.stylePanel.style.zIndex = "2147483601";
		this.stylePanel.style.display = "none";

		document.body.appendChild(this.stylePanel);
	}

	private px(v: number) {
		return `${Math.round(v)}px`;
	}

	private updateStyleInfo(el: HTMLElement) {
		if (!this.stylePanel) return;

		const style = this.getStyleCache(el);
		this.stylePanel.innerHTML = `
<b>${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}</b><br>
color: ${style.color}<br>
background: ${style.backgroundColor}<br>
font-size: ${style.fontSize}<br>
line-height: ${style.lineHeight}<br>
padding: ${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}<br>
margin: ${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}
`;
		this.stylePanel.style.display = "block";
	}

	private traverseDOM(node: Node, callback: (el: HTMLElement) => void) {
		if (this.isInternal(node)) return;

		if (node.nodeType === Node.ELEMENT_NODE) {
			callback(node as HTMLElement);
		}

		for (let i = 0; i < node.childNodes.length; i++) {
			this.traverseDOM(node.childNodes[i], callback);
		}
	}

	// ------- modes -------
	private applyWire(on: boolean) {
		this.traverseDOM(document.body, (el) => {
			if (this.isInternal(el)) return;
			el.classList.toggle(`${this.opts.prefix}dbg-outline`, on);
		});
		this.state.wire = on;
	}
	private applyGrid(on: boolean) {
		if (this.gridEl) this.gridEl.style.display = on ? "block" : "none";
		this.state.grid = on;
	}
	private applyTags(on: boolean) {
		this.traverseDOM(document.body, (el) => {
			if (this.isInternal(el)) return;

			const h = el as HTMLElement;
			if (on) {
				const classList = Array.from(h.classList).filter((c) => !c.startsWith(this.opts.prefix ?? ""));

				const info = h.tagName.toLowerCase() + (h.id ? `#${h.id}` : "") + (classList.length ? ` .${classList.join(".")}` : "");
				h.dataset.dbg = info;
			} else {
				delete h.dataset.dbg;
			}
			h.classList.toggle(`${this.opts.prefix}dbg-tag`, on);
		});
		this.state.tags = on;
	}

	private toggleMode(mode: keyof typeof this.state, btn?: HTMLElement) {
		const map: Record<string, (on: boolean) => void> = {
			wire: (on) => this.applyWire(on),
			highlight: (on) => (this.state.highlight = on),
			grid: (on) => this.applyGrid(on),
			tags: (on) => this.applyTags(on),
			styleInfo: (on) => (this.state.styleInfo = on),
		};

		const current = this.state[mode];
		const next = !current;
		map[mode](next);

		if (btn) btn.classList.toggle(`${this.opts.prefix}active`, next);
	}

	private bindShortcuts() {
		const shortcutHandler = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.altKey && e.code === "Pause") {
				this.applyWire(false);
				this.applyGrid(false);
				this.applyTags(false);
				this.state.highlight = false;
				this.state.styleInfo = false;

				if (this.toolbarEl) {
					this.traverseDOM(this.toolbarEl, (el) => {
						if (el.tagName === "BUTTON") {
							el.classList.remove(`${this.opts.prefix}active`);
						}
					});
				}

				if (this.overlayRoot) this.overlayRoot.style.display = "none";
				if (this.stylePanel) this.stylePanel.style.display = "none";

				Object.keys(this.state).forEach((k) => (this.state[k as keyof typeof this.state] = false));
			}
		};
		window.addEventListener("keydown", shortcutHandler);

		return () => {
			window.removeEventListener("keydown", shortcutHandler);
		};
	}
}

if (typeof window !== "undefined") {
	(window as any).PseudoDebugKit = PseudoDebugKit;
}
