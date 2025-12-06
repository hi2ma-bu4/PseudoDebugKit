export const defaultCSS = (accent = "#ff6b6b", prefix = "pdk-") => /* css */ `
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
`;
