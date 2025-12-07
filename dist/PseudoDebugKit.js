// src/style.ts
var defaultCSS = (accent = "#ff6b6b", prefix = "pdk-") => (
  /* css */
  `
:root{--${prefix}accent:${accent};--${prefix}panel-bg:rgba(255,255,255,0.9);}
#${prefix}dbg-toolbar{position:fixed;right:12px;top:12px;z-index:2147483000;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;background:var(--${prefix}panel-bg);backdrop-filter:blur(4px);font-family:system-ui, sans-serif;font-size:13px;color:#111;box-shadow:0 6px 18px rgba(0,0,0,.12);}
#${prefix}dbg-toolbar button{background:none;border:1px solid #ddd;padding:6px 8px;border-radius:6px;cursor:pointer;}
#${prefix}dbg-toolbar .${prefix}active{border-color:var(--${prefix}accent);}
#${prefix}dbg-grid{position:fixed;inset:0;pointer-events:none;z-index:2147482000;display:none;}
#${prefix}dbg-grid .${prefix}cols{height:100%;display:flex;gap:12px;padding:0 12px;}
#${prefix}dbg-grid .${prefix}col{flex:1;background:rgba(255,107,107,0.05);border-left:1px dashed rgba(0,0,0,0.04);}
.${prefix}dbg-outline{outline:2px dashed rgba(0,0,0,0.2);}
.${prefix}dbg-tag::after{content:attr(data-dbg);position:absolute;left:4px;top:-1.6em;background:rgba(0,0,0,.75);color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;transition:opacity .12s;white-space:nowrap;z-index:2000;opacity:0.8;pointer-events:none;}
:where(.${prefix}dbg-tag) {position: relative;}
#${prefix}dbg-hover-overlay {position: fixed;top: 0;left: 0;z-index: 2147483600;pointer-events: none;display: none;overflow: visible;}
#${prefix}dbg-hover-overlay > div {position: absolute;box-sizing: border-box;}
#${prefix}dbg-hover-content {background: rgba(0,150,255,0.3);}
#${prefix}dbg-hover-padding {background: rgba(0,255,150,0.25);}
#${prefix}dbg-hover-margin {background: rgba(255,180,0,0.25);}
`
);

// src/PseudoDebugKit.ts
var PseudoDebugKit = class {
  opts;
  root;
  styleEl;
  gridEl;
  toolbarEl;
  state = { wire: false, grid: false, tags: false, highlight: false, styleInfo: false };
  overlayRoot;
  overlayContent;
  overlayPadding;
  overlayMargin;
  stylePanel;
  shortcutCleanup;
  styleCache = /* @__PURE__ */ new WeakMap();
  parsedValuesCache = /* @__PURE__ */ new WeakMap();
  constructor(options) {
    this.opts = { gridColumns: 12, accent: "#ff6b6b", panel: false, shortcuts: false, prefix: "pdk-", ...options || {} };
  }
  init(root = document.body) {
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
  markInternal(el) {
    el.setAttribute(`data-${this.opts.prefix}internal`, "1");
  }
  isInternal(el) {
    return el instanceof HTMLElement && el.hasAttribute(`data-${this.opts.prefix}internal`);
  }
  injectStyle() {
    this.styleEl = document.createElement("style");
    this.styleEl.setAttribute(`data-pseudo-debugkit-style`, "");
    this.styleEl.textContent = defaultCSS(this.opts.accent, this.opts.prefix);
    document.head.appendChild(this.styleEl);
  }
  buildUI() {
    if (!this.opts.panel) return;
    this.buildToolbar();
    this.buildGrid();
  }
  buildToolbar() {
    this.toolbarEl = document.createElement("div");
    this.toolbarEl.id = `${this.opts.prefix}dbg-toolbar`;
    this.markInternal(this.toolbarEl);
    const modes = [
      ["wire", "Wireframe"],
      ["highlight", "Highlight"],
      ["styleInfo", "Style Info"],
      ["tags", "Tags"],
      ["grid", "Grid"]
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
  buildGrid() {
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
  setGridColumns(n) {
    if (!this.gridEl) return;
    const cols = this.gridEl.querySelector(`.${this.opts.prefix}cols`);
    if (!cols) return;
    while (cols.firstChild) cols.removeChild(cols.firstChild);
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = `${this.opts.prefix}col`;
      this.markInternal(c);
      cols.appendChild(c);
    }
  }
  enable() {
    this.show(true);
  }
  disable() {
    this.show(false);
  }
  toggle() {
    this.show(!this.isEnabled());
  }
  isEnabled() {
    return !!this.root;
  }
  setWire(on) {
    this.applyWire(on);
  }
  setGrid(on) {
    this.applyGrid(on);
  }
  setTags(on) {
    this.applyTags(on);
  }
  setHighlight(on) {
    this.state.highlight = on;
  }
  setStyleInfo(on) {
    this.state.styleInfo = on;
  }
  // ----- 状態取得用（オプション） -----
  getState() {
    return { ...this.state };
  }
  show(on) {
    if (!this.root) return;
    if (this.toolbarEl) this.toolbarEl.style.display = on ? "flex" : "none";
    if (this.gridEl) this.gridEl.style.display = on && this.state.grid ? "block" : "none";
  }
  destroy() {
    const elements = [this.styleEl, this.toolbarEl, this.gridEl, this.overlayRoot, this.stylePanel];
    for (const el of elements) {
      el?.remove();
    }
    this.shortcutCleanup?.();
    this.root = void 0;
  }
  buildHighlightOverlay() {
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
    const debouncedUpdate = this.debounce((target) => {
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
      debouncedUpdate(e.target);
    });
    document.addEventListener("mouseout", (e) => {
      debouncedHide();
    });
  }
  debounce(func, waitFor) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), waitFor);
    };
  }
  getStyleCache(el) {
    if (!this.styleCache.has(el)) {
      this.styleCache.set(el, getComputedStyle(el));
    }
    return this.styleCache.get(el);
  }
  parseCSSValue(style, prop) {
    if (!this.parsedValuesCache.has(style)) {
      this.parsedValuesCache.set(style, /* @__PURE__ */ new Map());
    }
    const cache = this.parsedValuesCache.get(style);
    if (!cache.has(prop)) {
      cache.set(prop, parseFloat(style.getPropertyValue(prop)));
    }
    return cache.get(prop);
  }
  updateHighlight(el) {
    if (!this.overlayRoot) return;
    const rect = el.getBoundingClientRect();
    const style = this.getStyleCache(el);
    const pad = {
      top: this.parseCSSValue(style, "padding-top"),
      right: this.parseCSSValue(style, "padding-right"),
      bottom: this.parseCSSValue(style, "padding-bottom"),
      left: this.parseCSSValue(style, "padding-left")
    };
    const mar = {
      top: this.parseCSSValue(style, "margin-top"),
      right: this.parseCSSValue(style, "margin-right"),
      bottom: this.parseCSSValue(style, "margin-bottom"),
      left: this.parseCSSValue(style, "margin-left")
    };
    this.overlayRoot.style.display = "block";
    this.overlayRoot.style.top = this.px(rect.top - mar.top);
    this.overlayRoot.style.left = this.px(rect.left - mar.left);
    this.overlayRoot.style.width = this.px(rect.width + mar.left + mar.right);
    this.overlayRoot.style.height = this.px(rect.height + mar.top + mar.bottom);
    this.overlayRoot.style.overflow = "visible";
    this.overlayMargin.style.top = "0px";
    this.overlayMargin.style.left = "0px";
    this.overlayMargin.style.width = "100%";
    this.overlayMargin.style.height = "100%";
    this.overlayPadding.style.top = this.px(mar.top);
    this.overlayPadding.style.left = this.px(mar.left);
    this.overlayPadding.style.width = this.px(rect.width);
    this.overlayPadding.style.height = this.px(rect.height);
    this.overlayContent.style.top = this.px(mar.top + pad.top);
    this.overlayContent.style.left = this.px(mar.left + pad.left);
    this.overlayContent.style.width = this.px(rect.width - pad.left - pad.right);
    this.overlayContent.style.height = this.px(rect.height - pad.top - pad.bottom);
  }
  buildStylePanel() {
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
  px(v) {
    return `${Math.round(v)}px`;
  }
  updateStyleInfo(el) {
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
  traverseDOM(node, callback) {
    if (this.isInternal(node)) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      callback(node);
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      this.traverseDOM(node.childNodes[i], callback);
    }
  }
  // ------- modes -------
  applyWire(on) {
    this.traverseDOM(document.body, (el) => {
      if (this.isInternal(el)) return;
      el.classList.toggle(`${this.opts.prefix}dbg-outline`, on);
    });
    this.state.wire = on;
  }
  applyGrid(on) {
    if (this.gridEl) this.gridEl.style.display = on ? "block" : "none";
    this.state.grid = on;
  }
  applyTags(on) {
    this.traverseDOM(document.body, (el) => {
      if (this.isInternal(el)) return;
      const h = el;
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
  toggleMode(mode, btn) {
    const map = {
      wire: (on) => this.applyWire(on),
      highlight: (on) => this.state.highlight = on,
      grid: (on) => this.applyGrid(on),
      tags: (on) => this.applyTags(on),
      styleInfo: (on) => this.state.styleInfo = on
    };
    const current = this.state[mode];
    const next = !current;
    map[mode](next);
    if (btn) btn.classList.toggle(`${this.opts.prefix}active`, next);
  }
  bindShortcuts() {
    const shortcutHandler = (e) => {
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
        Object.keys(this.state).forEach((k) => this.state[k] = false);
      }
    };
    window.addEventListener("keydown", shortcutHandler);
    return () => {
      window.removeEventListener("keydown", shortcutHandler);
    };
  }
};
if (typeof window !== "undefined") {
  window.PseudoDebugKit = PseudoDebugKit;
}
export {
  PseudoDebugKit
};
//# sourceMappingURL=PseudoDebugKit.js.map
