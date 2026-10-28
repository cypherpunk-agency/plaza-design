export const composerStyles = `
.scene-composer input[type=number]{appearance:textfield;-moz-appearance:textfield;cursor:ew-resize;touch-action:pan-y}
.scene-composer input[type=number]::-webkit-inner-spin-button,.scene-composer input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.scene-composer input[type=number]:focus{cursor:text}
.scene-composer input[type=number]:disabled,.scene-composer input[type=number][readonly]{cursor:default}
html[data-numeric-scrubbing],html[data-numeric-scrubbing] *{cursor:ew-resize!important;user-select:none!important}

.scene-composer{--chrome:#202020;--bg:#161616;--stage:#111111;--panel:#262626;--raised:#333333;--raised-hover:#3d3d3d;--field:#1b1b1b;--separator:#404040;--control-line:#737373;--grid-line:rgba(255,255,255,.06);--ink:#e8e8e8;--muted:#aaaaaa;--faint:#9c9c9c;--select:#5aa2ff;--select-bg:rgba(90,162,255,.16);--select-faint:rgba(90,162,255,.07);--select-ink:#0d1b2e;--primary:#e8e8e8;--primary-ink:#161616;--key:#e9bc45;--key-bg:rgba(233,188,69,.14);--key-ink:#1b1300;--changed:#3fc7b4;--draft:#c9a6ff;--play:#7fd18b;--play-ink:#07160a;--error:#ff8080;--error-bg:rgba(255,128,128,.12);--overlay:rgba(32,32,32,.94);--mono:'IBM Plex Mono',ui-monospace,monospace;--sans:Inter,system-ui,sans-serif;
  color:var(--ink);background:var(--bg);font:12px/16px var(--sans);height:100%;min-height:560px;display:flex;flex-direction:column}
.scene-composer *{box-sizing:border-box}
.scene-composer button,.scene-composer input,.scene-composer select,.scene-composer textarea{font:inherit;color:inherit;background:var(--field);border:1px solid var(--control-line);border-radius:3px;padding:4px 8px;min-width:0;min-height:26px}
.scene-composer button{cursor:pointer;background:var(--raised);white-space:nowrap;min-height:28px}.scene-composer button:hover:not(:disabled){background:var(--raised-hover);border-color:var(--muted)}.scene-composer button:disabled{opacity:.6;cursor:default}
.scene-composer button.primary{background:var(--primary);border-color:var(--primary);color:var(--primary-ink);font-weight:600}.scene-composer button.primary:disabled{background:var(--raised);border-color:var(--control-line);color:var(--muted);opacity:1}
.scene-composer input[type=checkbox]{min-height:0;width:16px;height:16px;accent-color:var(--select)}
.scene-composer :focus-visible{outline:2px solid var(--select);outline-offset:1px}
.scene-composer h2{font:600 12px/16px var(--sans);text-transform:none;letter-spacing:0;color:var(--ink);margin:16px 0 8px}.scene-composer aside>h2:first-child{margin-top:4px}
.scene-composer h3{font:600 11px/14px var(--sans);text-transform:uppercase;letter-spacing:.06em;color:var(--faint);margin:14px 0 6px}.scene-composer p{margin:5px 0}.scene-composer .muted{color:var(--muted)}
.scene-composer details{border-top:1px solid var(--separator);padding-top:8px;margin-top:10px}.scene-composer summary{cursor:pointer;color:var(--ink);font:600 12px/16px var(--sans);padding:2px 0}
.scene-composer .gameplay-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.scene-composer .gameplay-layout>section{min-width:0}.scene-composer .gameplay-layout pre{white-space:pre-wrap;overflow-wrap:anywhere}
.scene-composer .gameplay-fields{display:grid;gap:8px;padding:8px 0}.scene-composer .gameplay-fields label{display:grid;gap:4px;min-width:0}
.scene-composer .gameplay-fields input,.scene-composer .gameplay-fields select,.scene-composer .gameplay-fields textarea{width:100%;max-width:100%}
.scene-composer .gameplay-fields textarea{min-height:100px;resize:vertical}.scene-composer .gameplay-condition{min-width:0;border:1px solid var(--separator);border-radius:4px;display:grid;gap:6px}
.scene-composer .gameplay-editor .row,.scene-composer .gameplay-lab>div{display:flex;gap:6px;flex-wrap:wrap}
.scene-composer .logic-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start}
.scene-composer .logic-nav{position:sticky;top:0;max-height:calc(100vh - 150px);overflow:auto;display:flex;flex-direction:column;gap:1px;padding-right:10px;border-right:1px solid var(--separator)}.scene-composer .logic-nav h3{flex:none;margin:14px 0 4px}.scene-composer .logic-nav h3:first-child{margin-top:0}
.scene-composer .logic-nav button{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;white-space:normal;border:0;border-left:2px solid transparent;border-radius:0;background:none;padding:5px 10px;min-height:0}.scene-composer .logic-nav button small{color:var(--muted);font-size:11px}
.scene-composer .logic-nav button:hover{background:var(--raised)}.scene-composer .logic-nav button[aria-pressed=true]{border-left-color:var(--select);background:var(--raised);color:var(--select)}
.scene-composer .logic-detail{max-width:760px;min-width:0}.scene-composer .logic-detail>h2{margin-top:0;font-size:12px;color:var(--ink)}
.scene-composer .logic-detail label{display:grid;gap:4px;justify-content:stretch;margin:10px 0}.scene-composer .logic-detail label:has(>input[type=checkbox]){display:flex;justify-content:start;gap:10px}.scene-composer .logic-detail label>input:not([type=checkbox]),.scene-composer .logic-detail label>select,.scene-composer .logic-detail textarea{width:100%;max-width:100%}
.scene-composer .logic-detail textarea{min-height:90px}.scene-composer .gameplay-condition{padding:8px 12px 10px;margin:10px 0}.scene-composer .gameplay-condition>legend{padding:0 6px;color:var(--muted);font-size:12px}.scene-composer .gameplay-condition label{margin:4px 0}
.scene-composer .logic-detail details>summary{font-size:12px}.scene-composer .logic-detail details{margin-top:12px}

/* Top bar */
.scene-composer>header{display:flex;align-items:stretch;gap:12px;height:44px;flex:none;padding:0 10px 0 14px;border-bottom:1px solid var(--separator);background:var(--chrome)}.scene-composer .header-spacer{flex:none;width:4px}.scene-composer>header>.brand{align-self:center}
.scene-composer .brand{display:flex;align-items:baseline;gap:6px;font-family:var(--mono);white-space:nowrap}.scene-composer .brand strong{color:var(--ink);letter-spacing:.06em}.scene-composer .brand span{color:var(--muted)}
.scene-composer .document-picker{width:280px;max-width:100%;min-height:26px;font-family:var(--mono);font-size:12px}
.scene-composer .state{font-family:var(--mono);font-size:11px;white-space:nowrap}.scene-composer .state.dirty::before{content:'● ';color:var(--changed)}
.scene-composer .actions{display:flex;align-items:center;gap:6px;min-width:0;padding:6px 0}.scene-composer .actions>.state{margin-right:4px}
.scene-composer .menu{position:relative;border:0;padding:0;margin:0}.scene-composer .menu>summary{list-style:none;color:var(--ink);font:inherit;border:1px solid var(--separator);background:var(--raised);border-radius:4px;padding:5px 10px;min-height:28px;display:flex;align-items:center}.scene-composer .menu>summary::-webkit-details-marker{display:none}.scene-composer .menu>summary::after{content:'▾';margin-left:6px;color:var(--muted)}.scene-composer .menu[open]>summary{border-color:var(--select)}
.scene-composer .menu-items{position:absolute;right:0;top:calc(100% + 4px);z-index:20;min-width:180px;display:flex;flex-direction:column;padding:4px;background:var(--raised);border:1px solid var(--control-line);border-radius:6px;box-shadow:0 10px 30px #0009}.scene-composer .menu-items button{border:0;background:none;text-align:left;padding:8px 10px}.scene-composer .menu-items button:hover:not(:disabled){background:var(--raised-hover)}

/* Tool tabs */
.scene-composer .tools{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}.scene-composer .tools::-webkit-scrollbar{display:none}
.scene-composer .tools button{flex:none;min-height:0;height:44px;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--muted);padding:0 11px;font:13px/16px var(--sans)}.scene-composer .tools button:hover{color:var(--ink)}.scene-composer .tools button[aria-pressed=true]{color:var(--ink);font-weight:600;border-bottom-color:var(--select)}
.scene-composer .subtools{display:flex;align-items:center;gap:2px;height:36px;flex:none;padding:0 8px;border-bottom:1px solid var(--separator);background:var(--panel);overflow-x:auto;scrollbar-width:none}.scene-composer .subtools .scene-context{gap:6px}.scene-composer .subtools .document-picker{width:240px}.scene-composer .strip-divider{flex:none;width:1px;height:18px;background:var(--separator);margin:0 8px}.scene-composer .subtools[hidden]{display:none}
.scene-composer .subtools button{flex:none;min-height:0;height:36px;padding:0 12px;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--muted);font-size:12px}.scene-composer .subtools .scene-context button{height:28px;border:1px solid var(--control-line);border-radius:3px;background:var(--raised);color:var(--ink)}.scene-composer .subtools button[aria-pressed=true]{color:var(--ink);border-bottom-color:var(--select)}
.scene-composer .empty-state{max-width:560px;margin:48px auto;padding:0 16px}.scene-composer .empty-state h2{margin-top:0}.scene-composer .empty-state p{font-size:14px}.scene-composer .empty-state .row>button{flex:0 0 auto}
.scene-composer .status{min-width:0;max-width:44ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--muted)}.scene-composer .status:empty{display:none}.scene-composer .status.error{color:var(--error);background:var(--error-bg);padding:3px 8px;border-radius:3px}
.scene-composer .scene-context{display:flex;align-items:center;flex:none}.scene-composer .scene-views{display:flex;gap:4px;flex:none;padding:0 10px 0 6px;margin-right:6px;border-right:1px solid var(--separator)}.scene-composer .scene-views:last-child{border-right:0}
.scene-composer .tool-panel{margin:0;padding:0;border:0;flex:1;min-height:0;overflow:auto}.scene-composer .tool-panel:not([open]){display:none}.scene-composer .tool-panel>summary{display:none}
.scene-composer .tool-panel>section,.scene-composer .tool-panel>div{padding:12px 16px}
.scene-composer:not([data-tool=scene]) .workspace{display:none}
.scene-composer .workspace>.stage-panel{grid-area:left;overflow:auto;border-right:1px solid var(--separator);background:var(--panel)}.scene-composer .workspace>.stage-panel>section{padding:10px 12px}.scene-composer[data-stage-panel] .workspace{grid-template-columns:340px minmax(0,1fr) var(--right-w,300px)}.scene-composer[data-stage-panel] .panel-handle.left{display:none}.scene-composer[data-stage-panel] .workspace>aside:first-of-type{display:none}

/* Workspace */
.scene-composer,.scene-composer *{scrollbar-width:thin;scrollbar-color:var(--control-line) transparent}.scene-composer ::-webkit-scrollbar{width:10px;height:10px}.scene-composer ::-webkit-scrollbar-track{background:transparent}.scene-composer ::-webkit-scrollbar-thumb{background:var(--control-line);border:3px solid transparent;border-radius:6px;background-clip:padding-box}.scene-composer ::-webkit-scrollbar-thumb:hover{background:var(--muted);background-clip:padding-box}.scene-composer ::-webkit-scrollbar-corner{background:transparent}
.scene-composer .workspace{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:var(--left-w,256px) minmax(0,1fr) var(--right-w,300px);grid-template-areas:'left center right'}.scene-composer .panel-handle{position:absolute;top:0;bottom:0;width:7px;z-index:5;cursor:col-resize;touch-action:none}.scene-composer .panel-handle.left{left:calc(var(--left-w,256px) - 4px)}.scene-composer .panel-handle.right{right:calc(var(--right-w,300px) - 4px)}.scene-composer .panel-handle:hover,.scene-composer .panel-handle.dragging{background:linear-gradient(90deg,transparent 2px,var(--select) 2px,var(--select) 4px,transparent 4px)}
.scene-composer .preview-column{grid-area:center;min-width:0;min-height:0;display:flex;flex-direction:column}
.scene-composer .workspace>aside{padding:10px 12px;overflow:auto;background:var(--panel);min-height:0}.scene-composer .workspace>aside:first-of-type{grid-area:left;border-right:1px solid var(--separator)}.scene-composer .workspace>aside:last-of-type{grid-area:right;border-left:1px solid var(--separator)}
.scene-composer .workspace>aside>details:first-child{border-top:0;margin-top:0;padding-top:0}.scene-composer label:has(>input[type=checkbox]){flex-wrap:nowrap}
.scene-composer .preview-options{display:flex;align-items:center;flex:1 1 0;min-width:0;margin-left:4px;padding-left:10px;border-left:1px solid var(--separator)}.scene-composer .preview-options>.scene-toolbar{flex:1}.scene-composer .preview-options .toolbar-group[aria-label=Play]{margin-left:auto}.scene-composer .preview-options .toolbar-group[aria-label='Starting state']{flex:0 1 180px}.scene-composer .preview-options .toolbar-group[aria-label='Starting state'] select{width:100%;min-width:90px}.scene-composer .scene-composer .tools,.scene-composer>header>.tools,.scene-composer>header>.brand,.scene-composer>header>.actions{flex:none}.scene-composer:not([data-tool=scene]) .preview-options{display:none}.scene-composer .preview-options select{max-width:190px}
.scene-composer .preview-options .quick{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;padding:6px 10px}.scene-composer .preview-options .quick label{margin:0;justify-content:start}.scene-composer .preview-options .quick input[type=number]{width:72px}
.scene-composer .frame-step{display:flex;gap:4px}
.scene-composer .preview-options .environment{margin:0;padding:0 10px 6px;border-top:1px solid var(--separator)}.scene-composer .preview-options .environment>summary{padding:6px 0 0}
.scene-composer .environment-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 16px;padding-top:6px}.scene-composer .environment-grid label{margin:2px 0}.scene-composer .environment-grid label.wide{grid-column:span 2}.scene-composer .environment-grid label>input:not([type=checkbox]),.scene-composer .environment-grid label>select{width:auto;flex:0 1 120px}.scene-composer .environment-grid label.wide>input{flex-basis:220px}
.scene-composer .stage-wrap{position:relative;flex:1;min-height:200px;overflow:hidden}
.scene-composer .preview-stage{position:absolute;inset:0;overflow:auto;display:grid;align-items:safe center;justify-items:safe center;background:var(--stage);container-type:size;padding:8px;overscroll-behavior:contain}
.scene-composer .preview-stage>canvas[data-hover=artwork]{cursor:pointer}.scene-composer .preview-stage>canvas[data-dragging]{cursor:move}.scene-composer .preview-stage>canvas[data-hover=empty]{cursor:default}.scene-composer .preview-stage>canvas[data-panning]{cursor:grabbing}
.scene-composer .stage-play{position:absolute;inset:0;overflow:hidden;padding:8px;display:grid;place-items:center;container-type:size;background:var(--stage)}.scene-composer .stage-play[hidden],.scene-composer .preview-stage[hidden]{display:none}
.scene-composer .stage-play>.play-viewport{width:min(100cqw - 16px,(100cqh - 16px) * var(--play-ratio,1.7778));aspect-ratio:var(--play-ratio,1.7778);min-width:0;min-height:0;overflow:hidden}
.scene-composer[data-playing] .timeline,.scene-composer[data-playing] .hover-box,.scene-composer[data-playing] .viewport-tools,.scene-composer[data-playing] .view-menus,.scene-composer[data-playing] .preview-bar,.scene-composer[data-playing] .render-status{display:none}
.scene-composer[data-playing] .stage-wrap{min-height:0}
.scene-composer[data-playing]{min-height:0}
.scene-composer .preview-stage.comparing{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.scene-composer .preview-stage.comparing>canvas{width:min(50cqw - 12px,(100cqh - 16px) * var(--fit-ratio,var(--ratio,1.7778)))}.scene-composer .preview-stage>canvas.compare{cursor:grab}.scene-composer .preview-stage{cursor:grab}.scene-composer .preview-stage[data-panning]{cursor:grabbing}.scene-composer .preview-stage>canvas[hidden]{display:none}
.scene-composer .hover-box{position:absolute;pointer-events:none;outline:1px solid var(--select);outline-offset:1px}.scene-composer .hover-box[hidden]{display:none}
.scene-composer .hover-box[data-below]::after{bottom:auto;top:calc(100% + 3px)}.scene-composer .hover-box[data-right]::after{left:auto;right:-2px}
.scene-composer .hover-box::after{content:attr(data-label);position:absolute;left:-2px;bottom:calc(100% + 3px);font:11px/1.4 var(--mono);background:var(--overlay);color:var(--ink);padding:1px 6px;border-radius:3px;white-space:nowrap}
.scene-composer .selection-box{outline:none}.scene-composer .selection-box::after{color:var(--select)}
.scene-composer .viewport-tools{position:absolute;left:12px;bottom:12px;z-index:3;display:flex;gap:2px;padding:3px;background:var(--overlay);border:1px solid var(--separator);border-radius:6px}.scene-composer .viewport-tools[hidden]{display:none}
.scene-composer .viewport-tools button{min-height:26px;padding:2px 9px;border-color:transparent;background:none;font:12px/16px var(--sans)}.scene-composer .viewport-tools .zoom-level{min-width:56px}.scene-composer .viewport-tools button[aria-pressed=true]{color:var(--select);border-color:var(--control-line)}
.scene-composer canvas{display:block;max-width:100%;image-rendering:pixelated;touch-action:none}
.scene-composer .preview-stage>canvas{width:min(100cqw - 16px,(100cqh - 16px) * var(--fit-ratio,var(--ratio,1.7778)));height:auto;box-shadow:0 0 0 1px var(--separator)}
.scene-composer .preview-stage.workspace-view{padding:0}.scene-composer .preview-stage.workspace-view>canvas{position:absolute;inset:0;width:100%;height:100%;max-width:none;box-shadow:none}
.scene-composer .view-context{flex-basis:100%;margin:0;color:var(--muted);font-size:11px}
.scene-composer .preview-error{position:absolute;inset:20px auto auto 20px;max-width:85%;padding:10px;background:var(--error-bg);color:var(--error);white-space:pre-wrap}.scene-composer .preview-error[hidden]{display:none}
.scene-composer .timeline{border-top:1px solid var(--separator);padding:9px 12px;max-height:40%;overflow:auto;background:var(--panel)}.scene-composer .timeline:empty{display:none}.scene-composer .timeline input[type=range]{flex:1;min-width:100px}.scene-composer .timeline .time{font-variant-numeric:tabular-nums;white-space:nowrap}.scene-composer .timeline-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Scene toolbar */
.scene-composer .scene-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:nowrap;min-width:0;overflow:hidden}
.scene-composer .toolbar-group{display:flex;align-items:center;gap:4px;flex:none;min-width:0}.scene-composer .toolbar-label{color:var(--muted);font-size:12px;margin-right:2px}
.scene-composer .scene-toolbar .time{font:12px/1 var(--mono);color:var(--muted);min-width:44px;text-align:right;font-variant-numeric:tabular-nums}
.scene-composer .scene-toolbar select{font-size:12px;max-width:170px}
.scene-composer .toggle[aria-pressed=true],.scene-composer .scene-toolbar button[aria-pressed=true]{color:var(--select);border-color:var(--select);background:var(--select-bg)}
.scene-composer .segmented button[aria-pressed=true]{background:var(--select-bg)}
.scene-composer .play-button{margin-left:auto;border-color:var(--control-line);color:var(--ink)}
.scene-composer .more-menu{position:relative;border:0;margin:0;padding:0}.scene-composer .more-menu>summary{list-style:none;color:var(--ink);font:12px/16px var(--sans);border:1px solid var(--separator);background:var(--raised);border-radius:4px;padding:5px 10px;min-height:28px;display:flex;align-items:center}.scene-composer .more-menu>summary::-webkit-details-marker{display:none}.scene-composer .more-menu>summary::after{content:'▾';margin-left:6px;color:var(--muted)}.scene-composer .more-menu[open]>summary{border-color:var(--select)}
.scene-composer .more-panel{position:absolute;left:0;top:calc(100% + 4px);z-index:20;width:min(380px,80vw);max-height:60vh;overflow:auto;padding:8px 12px;background:var(--raised);border:1px solid var(--control-line);border-radius:6px;box-shadow:0 10px 30px #0009}
.scene-composer .more-panel label>input:not([type=checkbox]),.scene-composer .more-panel label>select{width:170px}.scene-composer .more-panel label.wide{flex-wrap:wrap}.scene-composer .more-panel label.wide>input{width:100%}

/* Add picker and artwork tiles */
.scene-composer .add-picker{position:fixed;inset:var(--picker-top,92px) 16px 16px;z-index:40;display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:var(--panel);border:1px solid var(--control-line);border-radius:8px;box-shadow:0 14px 40px #000c}.scene-composer .add-picker[hidden]{display:none}
.scene-composer .picker-head{display:flex;align-items:center;gap:8px}.scene-composer .picker-head input[type=search]{flex:1}.scene-composer .picker-head strong{font:600 12px var(--mono);color:var(--ink);white-space:nowrap}
.scene-composer .picker-head .muted{font-size:11px;margin-right:auto}.scene-composer .picker-browser{flex:1;min-height:0;overflow:auto}.scene-composer .picker-browser .catalog-list{max-height:none}
.scene-composer .picker-grid{flex:1;min-height:0;overflow:auto;display:grid;grid-auto-rows:max-content;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;align-content:start}
.scene-composer .asset-card{display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:6px;white-space:normal;text-align:left;background:var(--field);min-height:0}.scene-composer .asset-card span{font-size:12px;line-height:1.3;overflow-wrap:anywhere}.scene-composer .asset-card .tag{display:block;width:fit-content;margin-top:2px;padding:0 5px;border-radius:3px;background:rgba(255,255,255,.06);font-family:var(--mono);font-size:11px;color:var(--muted)}
.scene-composer .asset-card[aria-pressed=true]{border-color:var(--select);background:var(--select-bg)}

.scene-composer canvas.asset-thumb{width:100%;height:84px;flex:none;object-fit:contain;background:var(--stage);border-radius:3px;image-rendering:pixelated}.scene-composer canvas.asset-thumb[data-empty]{background:repeating-linear-gradient(45deg,var(--stage) 0 6px,var(--bg) 6px 12px)}
.scene-composer .asset-grid{display:grid;grid-auto-rows:max-content;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;align-content:start}
.scene-composer .asset-browser-grid:has(.asset-grid){grid-template-columns:minmax(0,1fr) minmax(320px,38%)}.scene-composer .asset-browser-grid:has(.asset-grid) .catalog-list{max-height:calc(100vh - 260px)}
.scene-composer .asset-browser-grid.with-districts,.scene-composer .asset-browser-grid.with-districts:has(.asset-grid){grid-template-columns:150px minmax(0,1fr) minmax(320px,36%)}
.scene-composer .district-bar{display:flex;flex-direction:column;gap:4px;align-content:start}.scene-composer .district-bar .chip{display:flex;justify-content:space-between;width:100%;text-align:left;font-size:12px;padding:5px 8px;border-radius:999px;background:var(--field)}.scene-composer .district-bar .chip[aria-pressed=true]{border-color:var(--select);background:var(--select-bg);color:var(--ink,inherit)}.scene-composer .district-bar .chip:disabled{opacity:.4}.scene-composer .district-bar .chip{gap:6px}.scene-composer .district-bar .chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .district-bar .chip small{flex:none;color:var(--muted)}
.scene-composer .asset-filter{min-width:0}.scene-composer .asset-filter>summary{cursor:pointer;font:600 11px/1.6 var(--mono);color:var(--muted);padding:6px 2px;overflow-wrap:anywhere}.scene-composer .asset-filter-options{display:flex;flex-direction:column;gap:4px}
.scene-composer .style-frames{display:grid;gap:12px;align-content:start}.scene-composer .style-frames .district-bar{flex-direction:row;flex-wrap:wrap}.scene-composer .style-frames .district-bar .chip{width:auto;gap:6px}.scene-composer .frame-list{display:grid;grid-template-columns:1fr 1fr;gap:8px}.scene-composer .frame-list canvas{width:100%;height:auto;background:var(--stage);display:block}.scene-composer .style-frame{display:grid;gap:10px;min-width:0;align-content:start}.scene-composer .style-frame h3{margin:0}.scene-composer .style-frame .motto{margin:2px 0 0;font-style:italic;color:#ffd9a5}
.scene-composer .style-frame .swatches{display:flex;gap:4px;max-width:420px}.scene-composer .style-frame .swatches span{flex:1;height:14px;border-radius:2px}
.scene-composer .frame-body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}.scene-composer .frame-body canvas{width:100%;height:auto;background:var(--stage);display:block;margin-top:8px}.scene-composer .frame-body .toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.scene-composer .frame-strip{position:sticky;bottom:0;z-index:3;display:grid;grid-auto-flow:column;grid-auto-columns:150px;gap:8px;overflow-x:auto;margin-top:10px;padding:8px 0;background:var(--bg);border-top:1px solid var(--separator);box-shadow:0 -8px 16px #0008}.scene-composer .frame-strip canvas{margin:0}
.scene-composer .frame-compare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.scene-composer .frame-compare figure{margin:0;min-width:0}.scene-composer .frame-compare h3{margin:8px 0 0}
.scene-composer .style-frame dl{display:grid;grid-template-columns:80px minmax(0,1fr);gap:6px 10px;margin:0;font-size:12px}.scene-composer .style-frame dt{color:var(--muted);font:600 11px/1.5 var(--mono);text-transform:uppercase;letter-spacing:.05em}.scene-composer .style-frame dd{margin:0}
@media(min-width:1101px){.scene-composer[data-stage-panel=storyboard] .workspace{grid-template-columns:420px minmax(0,1fr) var(--right-w,300px)}}
.scene-composer .storyboard{display:grid;gap:12px;align-content:start;min-width:0}.scene-composer .storyboard header h3{margin:0}.scene-composer .storyboard header p{margin:2px 0 0;font-size:12px}.scene-composer .storyboard .error:empty{display:none}
.scene-composer .story-act{display:grid;gap:6px;min-width:0}.scene-composer .story-act .act-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;text-align:left;padding:5px 8px;background:none;border-color:transparent;border-left:2px solid var(--control-line);border-radius:0;white-space:normal}.scene-composer .story-act .act-head strong{font-size:12px}.scene-composer .story-act .act-head small{color:var(--muted);font:11px var(--mono)}.scene-composer .story-act .act-head span{grid-column:1/-1;font-size:12px;line-height:1.35}.scene-composer .story-act .act-head[aria-pressed=true]{border-left-color:var(--select);background:var(--select-bg)}
.scene-composer .story-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity}.scene-composer .story-strip>button{flex:0 0 136px;scroll-snap-align:start}.scene-composer .beat-card canvas,.scene-composer .beat-card .beat-empty{width:100%;aspect-ratio:16/9;height:auto;display:block;background:var(--stage);border-radius:2px}.scene-composer .beat-card .beat-empty{display:grid;place-items:center;font:11px var(--mono);color:var(--muted);border:1px dashed var(--control-line);box-sizing:border-box}
.scene-composer .beat-card strong{font-size:12px;line-height:1.3}.scene-composer .beat-card strong small{color:var(--muted);font:500 11px var(--mono)}.scene-composer .beat-card .beat-place{font-size:11px;color:var(--muted)}.scene-composer .beat-chips{display:flex;flex-wrap:wrap;gap:3px}.scene-composer .beat-chips .tag{margin:0}.scene-composer .beat-card[data-status=exists] .beat-status{color:#9be8b0;background:rgba(80,200,120,.14)}.scene-composer .beat-card[data-status=rework] .beat-status{color:#e9bc45;background:rgba(255,210,122,.14)}.scene-composer .beat-card[data-status=new] .beat-status{color:#ffb0d0;background:rgba(255,120,170,.14)}
.scene-composer .story-strip .add-beat{border-style:dashed;color:var(--muted);flex-basis:72px;font-size:12px}.scene-composer .storyboard .add-act{justify-self:start;border-style:dashed}
.scene-composer .beat-form{display:grid;gap:6px;padding:8px 10px;background:var(--raised);border:1px solid var(--separator);border-radius:4px}.scene-composer .beat-form h4{margin:0;font-size:12px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:.04em}.scene-composer .beat-form label{display:grid;grid-template-columns:84px minmax(0,1fr);align-items:center;gap:6px;font-size:12px}.scene-composer .beat-form input,.scene-composer .beat-form select,.scene-composer .beat-form textarea{width:100%;min-width:0;box-sizing:border-box}.scene-composer .beat-form textarea{resize:vertical}.scene-composer .beat-form .row{display:flex;flex-wrap:wrap;gap:4px}
.scene-composer .asset-browser-grid .primary{margin:6px 0 10px}

/* Inspector */
.scene-composer .inspector-head h2{font:600 14px/20px var(--mono);text-transform:none;letter-spacing:0;color:var(--ink);margin:2px 0 2px;overflow-wrap:anywhere}.scene-composer .inspector-head .row{margin-top:8px}
.scene-composer .inspector-tabs{display:flex;gap:2px;margin:10px -12px 0;padding:0 8px;border-bottom:1px solid var(--separator);overflow-x:auto;scrollbar-width:none}
.scene-composer .inspector-tabs button{flex:none;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--muted);padding:6px 10px;font:12px/16px var(--sans)}.scene-composer .inspector-tabs button[aria-selected=true]{color:var(--select);border-bottom-color:var(--select)}
.scene-composer .inspector-body>p:first-child{margin-top:10px}
.scene-composer .inspector-part>summary,.scene-composer .inspector-section>summary{font-size:12px}
.scene-composer .inspector-mount .logic-detail{max-width:none}.scene-composer .inspector-mount .logic-detail label,.scene-composer .inspector-mount .gameplay-fields label{display:grid;gap:4px;justify-content:stretch}.scene-composer .inspector-mount label>input:not([type=checkbox]),.scene-composer .inspector-mount label>select,.scene-composer .inspector-mount textarea{width:100%}
.scene-composer .inspector-mount label:has(>input[type=checkbox]){display:flex;justify-content:start}
.scene-composer .world-map canvas{max-width:1100px}

/* Forms and lists */
.scene-composer .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.scene-composer .row>*{flex:1}.scene-composer .row>button{flex:0 1 auto}
.scene-composer label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0}.scene-composer label>span{color:var(--muted)}.scene-composer label>input:not([type=checkbox]),.scene-composer label>select{width:130px}.scene-composer label>input[type=checkbox]{margin-right:auto}
.scene-composer textarea{display:block;width:100%;min-height:95px;resize:vertical;font:12px/1.5 var(--mono);tab-size:2}
.scene-composer .hierarchy{list-style:none;margin:0 -6px;padding:0}.scene-composer .hierarchy button{display:block;width:100%;text-align:left;margin:0;border:0;border-left:2px solid transparent;border-radius:0;background:none;min-height:28px;padding:4px 10px;font:12px/1.4 var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .hierarchy button:hover{background:var(--raised)}.scene-composer .hierarchy button[aria-pressed=true]{border-left-color:var(--select);background:var(--select-bg);color:var(--select)}
.scene-composer .layers>.hierarchy{margin-top:6px}.scene-composer .catalog-list{max-height:320px;overflow:auto}.scene-composer .catalog-group{border:0;margin:0;padding:2px 0}.scene-composer .catalog-group>button{display:block;width:100%;text-align:left;margin:1px 0;border-color:transparent;background:none;font-size:12px}.scene-composer .catalog-group>button:hover{background:var(--raised)}
.scene-composer .layer-tools{display:flex;gap:6px;align-items:center;margin:6px 0}.scene-composer .layer-tools input[type=search]{flex:1;width:auto}
.scene-composer .segmented{display:flex}.scene-composer .segmented button{border-radius:0;padding:4px 8px;font:12px/16px var(--sans)}.scene-composer .segmented button:first-child{border-radius:4px 0 0 4px}.scene-composer .segmented button:last-child{border-radius:0 4px 4px 0;border-left:0}.scene-composer .segmented button[aria-pressed=true]{color:var(--select);border-color:var(--select)}
.scene-composer .layer-group{margin-top:4px;padding-top:4px}.scene-composer .layer-group>summary{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.scene-composer .layer-group>summary:hover{color:var(--ink)}
.scene-composer .layer-stack{display:flex;flex-direction:column;gap:2px;margin-top:4px}.scene-composer .stack-layer{border-top:1px solid var(--separator);padding-top:2px}.scene-composer .stack-head{display:flex;justify-content:space-between;padding:4px 4px 2px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink);cursor:default}.scene-composer .hierarchy li[draggable=true]{cursor:grab}.scene-composer .hierarchy li.dragging{opacity:.4}.scene-composer .drop-target{box-shadow:inset 0 2px 0 var(--select)}.scene-composer .stack-head.drop-target{background:var(--raised)}.scene-composer .player-row button{color:var(--ink);font-weight:600}.scene-composer .hierarchy li{display:flex;align-items:center}.scene-composer .hierarchy li>button:not(.eye){flex:1;min-width:0}.scene-composer .eye,.scene-composer .hierarchy .eye{flex:none;display:inline-flex!important;align-items:center;justify-content:center;width:22px!important;min-width:22px;min-height:22px;margin:0;padding:0!important;border:0!important;background:none!important;color:var(--muted);cursor:pointer}.scene-composer .eye:hover{color:var(--ink)}.scene-composer .eye[data-off=true]{color:var(--faint)}.scene-composer .hierarchy li.is-hidden>button:not(.eye){opacity:.45}.scene-composer .stack-head{align-items:center;gap:4px}.scene-composer .stack-name{flex:1}.scene-composer .stack-layer .hierarchy li>button:not(.eye),.scene-composer .logic-group .hierarchy li>button:not(.eye){padding-left:44px!important}.scene-composer .stack-head{padding-left:4px}.scene-composer .fold{flex:none;width:18px;min-height:20px;margin:0;padding:0;border:0;background:none;color:var(--muted);font-size:11px;cursor:pointer}.scene-composer .fold:hover{color:var(--ink)}.scene-composer .eye-space{flex:none;width:22px}.scene-composer details.logic-group>summary .eye{float:right;min-height:18px}.scene-composer .show-all{font-size:11px;padding:2px 6px;white-space:nowrap}
.scene-composer .hierarchy button{display:flex!important;align-items:baseline;justify-content:space-between;gap:8px}.scene-composer .layer-name{overflow:hidden;text-overflow:ellipsis}.scene-composer .layer-kind{flex:0 1 auto;max-width:55%;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font:11px/1.4 var(--sans);opacity:.8}.scene-composer .catalog-list>button{display:block;width:100%;text-align:left;margin:2px 0;border-color:transparent;background:none}.scene-composer .catalog-list>button:hover{background:var(--raised)}
.scene-composer .binding-row{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.scene-composer .binding-row code{font:11px/1.4 var(--mono);color:var(--ink);overflow-wrap:anywhere;text-align:right}
.scene-composer .tool-panel label{justify-content:flex-start;gap:12px}.scene-composer .tool-panel label>input:not([type=checkbox]),.scene-composer .tool-panel label>select{width:auto;min-width:140px}
.scene-composer .debug-drawer{margin-top:14px}.scene-composer .debug-drawer>summary{color:var(--muted)}.scene-composer .debug-drawer pre{font:11px/1.45 var(--mono);background:var(--field);border:1px solid var(--separator);border-radius:4px;padding:8px}
.scene-composer .danger{color:var(--error)}
.scene-composer .inspector-task,.scene-composer .inspector-warning{min-width:0;white-space:normal;overflow-wrap:anywhere}
.scene-composer .inspector-task label{display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:4px;margin:0 0 10px}
.scene-composer .inspector-task label>input,.scene-composer .inspector-task label>select{width:100%!important;min-width:0;box-sizing:border-box}
.scene-composer .inspector-task-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.scene-composer .inspector-warning{padding:10px;margin-bottom:12px;border:1px solid var(--error);border-radius:4px;background:var(--error-bg)}
.scene-composer .inspector-warning h3{margin:0 0 8px}.scene-composer .inspector-warning p,.scene-composer .inspector-error{white-space:pre-wrap;overflow-wrap:anywhere}
.scene-composer .inspector-error{color:var(--error)}.scene-composer .inspector-error:empty{display:none}
.scene-composer .inspector-warning button{margin:3px}.scene-composer .inspector-warning details{margin-top:8px}
.scene-composer .scene-boundary.connection-endpoint{border-color:var(--select);color:var(--select)}
.scene-composer .world-connection-guide[aria-pressed=true]{border-color:var(--select);color:var(--select)}
.scene-composer .dirty{color:var(--changed)}.scene-composer .readonly{border:1px solid var(--separator);padding:8px;border-radius:4px;margin-top:10px}

/* Asset browser and workbenches */
.scene-composer .asset-browser-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;padding:4px 0}.scene-composer .asset-browser-grid input,.scene-composer .asset-browser-grid select{width:100%;margin:4px 0}.scene-composer .asset-browser-grid .catalog-list{max-height:55vh}.scene-composer .asset-browser-grid canvas{background:var(--stage);max-width:960px;width:100%}.scene-composer .asset-browser-grid pre{font:12px/1.5 var(--mono);overflow-wrap:anywhere;white-space:pre-wrap}.scene-composer .asset-browser-grid section{min-width:0}
.scene-composer .character-workbench .frame-stage>div,.scene-composer .vehicle-workbench .frame-stage>div,.scene-composer .signage-workbench .frame-stage>div{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.scene-composer .character-workbench label,.scene-composer .vehicle-workbench label{justify-content:start}.scene-composer .character-workbench canvas{width:100%!important}.scene-composer .vehicle-workbench canvas{max-width:900px;width:100%}.scene-composer .workbench-screen canvas{background:var(--stage)}.scene-composer .workbench-screen pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 var(--mono)}


/* World › Zones */
.scene-composer .zone-intro{font-size:14px;margin:0 0 10px}
.scene-composer .zone-editor{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:16px;align-items:start}
.scene-composer .seam-list{background:var(--panel);border:1px solid var(--separator);border-radius:6px;padding:8px}
.scene-composer .seam-list h2{margin:2px 4px 8px}
.scene-composer .seam-list ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.scene-composer .seam-row{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;border-left:2px solid transparent;border-radius:0;background:none;padding:6px 8px;white-space:normal}
.scene-composer .seam-row:hover{background:var(--raised)}
.scene-composer .seam-row[aria-pressed=true]{background:var(--raised);border-left-color:var(--select)}
.scene-composer .seam-icon{flex:none;display:inline-flex;color:var(--muted)}
.scene-composer .seam-words{flex:1;min-width:0;display:flex;flex-direction:column}
.scene-composer .seam-words small{color:var(--muted);font:11px/1.3 var(--mono)}
.scene-composer .seam-badge{flex:none;font:600 11px/1 var(--mono);padding:3px 7px;border-radius:999px}
.scene-composer .seam-badge.ok{color:var(--ink);background:var(--raised)}
.scene-composer .seam-badge.bad{color:var(--error);background:var(--error-bg)}
.scene-composer .seam-list .row{margin-top:8px}
.scene-composer .seam-card{background:var(--panel);border:1px solid var(--separator);border-radius:6px;padding:12px 14px;max-width:780px}
.scene-composer .seam-head h3{font:600 14px/20px var(--sans);text-transform:none;letter-spacing:0;color:var(--ink);margin:0 0 8px}
.scene-composer .seam-kind{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.scene-composer .seam-ends-grid,.scene-composer .seam-offsets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin:8px 0}
.scene-composer .seam-end{display:flex;flex-direction:column;gap:6px}
.scene-composer .seam-field label{display:flex;flex-direction:column;align-items:stretch;gap:3px;margin:0}
.scene-composer .seam-field label>span{color:var(--muted);font-size:12px}
.scene-composer .seam-control{display:flex;gap:6px;align-items:center}
.scene-composer .seam-control>select,.scene-composer .seam-control>input{flex:1;min-width:0;width:auto}
.scene-composer .seam-control>button{flex:none}
.scene-composer button.link{background:none;border-color:transparent;color:var(--ink);padding:4px 6px;text-decoration:underline;min-height:0}
.scene-composer .hint{color:var(--muted);font-size:12px;margin:2px 0 0}
.scene-composer .field-problem{color:var(--error);background:var(--error-bg);border-radius:4px;padding:4px 8px;font-size:12px;margin:4px 0 0}
.scene-composer .zone-diagram{margin:10px 0;border:1px solid var(--separator);border-radius:6px;background:var(--stage);padding:6px}
.scene-composer .zone-diagram svg{display:block;width:100%;height:auto;max-height:240px}
.scene-composer .zone-diagram rect,.scene-composer .zone-diagram line{vector-effect:non-scaling-stroke}
.scene-composer .zone-diagram rect{stroke-width:1.5}
.scene-composer .zone-diagram rect.zone-from{fill:var(--raised);stroke:var(--control-line)}
.scene-composer .zone-diagram rect.zone-to{fill:var(--select);fill-opacity:.12;stroke:var(--select);stroke-dasharray:6 4}
.scene-composer .zone-diagram line.floor{stroke:var(--muted);stroke-width:2}
.scene-composer .zone-diagram line.floor.zone-to{stroke:var(--select)}
.scene-composer .zone-diagram .seam{stroke:var(--select);stroke-width:3;fill:var(--select)}
.scene-composer .zone-diagram .seam.bad{stroke:var(--error);fill:var(--error)}
.scene-composer .zone-diagram .seam.gap{stroke-dasharray:4 3}
.scene-composer .zone-diagram text{fill:var(--ink);font-family:var(--mono)}
.scene-composer .zone-diagram text.caption{fill:var(--muted)}
.scene-composer .seam-status{font-weight:600;margin:6px 0}
.scene-composer .seam-status.ok{color:var(--ink)}.scene-composer .seam-status.bad{color:var(--error)}
.scene-composer .seam-foot{justify-content:space-between;align-items:flex-end;border-top:1px solid var(--separator);padding-top:10px;margin-top:10px}
/* Scene preview: joined scenes (read-only neighbours) */
.scene-composer .joined-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3}
.scene-composer .stage-play:not([hidden])~.joined-tags{display:none}
.scene-composer .joined-tag{position:absolute;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;width:max-content;padding:4px 6px 4px 10px;border:1px solid var(--control-line);border-radius:999px;background:var(--overlay);color:var(--ink);font:12px/1.3 var(--mono);pointer-events:auto}
.scene-composer .joined-tag>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.scene-composer .joined-tag>button{flex:none}
.scene-composer .joined-tag button{min-height:24px;padding:2px 8px;font-size:12px;border-radius:999px}
/* A barrier's Access tab, and its mark in the outline */
.scene-composer .barrier-head{border:1px solid var(--separator);border-left:1px solid var(--separator);border-radius:6px;background:var(--raised);padding:10px 12px;margin:4px 0 10px}
.scene-composer .barrier-head h3{margin:0 0 6px}
.scene-composer .barrier-rule{font-size:14px;line-height:1.4;color:var(--ink);margin:0}
.scene-composer .barrier-toggles{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px}
.scene-composer .barrier-toggles .toggle::before{content:'○ '}.scene-composer .barrier-toggles .toggle[aria-pressed=true]::before{content:'● '}
.scene-composer .barrier-result{font-size:14px;font-weight:600;padding:8px 12px;border-radius:6px;margin:6px 0 4px}
.scene-composer .barrier-result.ok{color:var(--ink);background:var(--raised)}
.scene-composer .barrier-result.error{color:var(--error);background:var(--error-bg)}
.scene-composer .layer-badge{display:inline-flex;vertical-align:-2px;margin-right:6px;color:var(--muted)}

/* The bottom temporal editor shares the stage, inspector and native preview. */
.scene-composer .timeline{position:relative;display:flex;flex-direction:column;flex:none;min-height:42px;max-height:65%;padding:0;overflow:visible}
.scene-composer .timeline[hidden]{display:none}.scene-composer .timeline.collapsed{max-height:42px}
.scene-composer .timeline-resize{position:absolute;left:0;right:0;top:-4px;height:7px;cursor:row-resize;touch-action:none;z-index:8}.scene-composer .timeline-resize:hover,.scene-composer .timeline-resize:focus-visible{background:var(--select)}
.scene-composer .timeline-transport{display:flex;flex:none;align-items:center;gap:5px;padding:6px 9px;border-bottom:1px solid var(--separator);position:relative;min-height:42px;flex-wrap:wrap}
.scene-composer .timeline-transport>button{min-height:26px;padding:3px 7px;font-size:11px}.scene-composer .timeline-transport label{margin:0;gap:5px;font-size:11px}.scene-composer .timeline-transport label>input{width:48px;min-height:25px;padding:3px}.scene-composer .timeline-transport select{max-width:160px;min-height:26px;font-size:11px}.scene-composer .timeline .time{font:11px var(--mono);color:var(--muted);margin-right:auto}
.scene-composer .timeline-settings{border:0;margin:0;padding:0;position:relative;z-index:9}.scene-composer .timeline-settings>summary{font-size:11px;cursor:pointer;padding:3px 6px}.scene-composer .timeline-settings>div{position:absolute;right:0;bottom:calc(100% + 12px);width:370px;max-width:75vw;max-height:60vh;overflow:auto;background:var(--panel);border:1px solid var(--control-line);padding:12px;box-shadow:0 5px 20px #0008}.scene-composer .timeline-settings label{margin:7px 0}.scene-composer .timeline-settings textarea{width:100%}
.scene-composer .keyframe-viewport{min-height:0;flex:1;overflow:auto;position:relative;overscroll-behavior:contain;background:var(--bg)}
.scene-composer .keyframe-body{position:relative;min-height:100%}.scene-composer .keyframe-row{display:grid;grid-template-columns:var(--tl-label) minmax(0,1fr);min-height:27px;border-bottom:1px solid var(--separator)}
.scene-composer .keyframe-label{position:sticky;left:0;z-index:3;background:var(--panel);border:0;border-right:1px solid var(--separator);border-radius:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 10px;font:11px var(--mono);min-height:27px}
.scene-composer button.keyframe-label{background:var(--panel);border:0;border-right:1px solid var(--separator);border-radius:0;min-height:27px;padding:5px 10px}
.scene-composer button.keyframe-property{padding-left:27px;color:var(--muted)}.scene-composer .keyframe-group-row{background:var(--raised)}.scene-composer .keyframe-group{color:var(--ink);font-weight:500}
.scene-composer .keyframe-row.selected>.keyframe-label{color:var(--select);box-shadow:inset 2px 0 var(--select)}.scene-composer .keyframe-row.selected>.keyframe-lane{background-color:var(--select-faint)}
.scene-composer .keyframe-lane{position:relative;min-width:0;touch-action:none;background-image:linear-gradient(90deg,var(--grid-line) 1px,transparent 1px);background-size:10% 100%}
.scene-composer .ruler-row{position:sticky;top:0;z-index:5;background:var(--panel);height:29px}.scene-composer .ruler-row .keyframe-label{color:var(--muted);font:11px var(--sans)}
.scene-composer .time-ruler{cursor:ew-resize;background-color:var(--panel)}.scene-composer .keyframe-tick{position:absolute;top:0;padding:2px 4px 0;border-left:1px solid var(--control-line);height:100%;font:11px var(--mono);color:var(--muted);pointer-events:none}
.scene-composer .keyframe-playhead{position:absolute;top:17px;bottom:0;width:1px;background:var(--select);z-index:6;pointer-events:none}.scene-composer .keyframe-playhead:before{content:'';position:absolute;left:-5px;top:-2px;width:11px;height:10px;background:var(--select);clip-path:polygon(0 0,100% 0,100% 45%,50% 100%,0 45%)}
.scene-composer button.keyframe-diamond{position:absolute;top:50%;transform:translate(-50%,-50%) rotate(45deg);width:10px;height:10px;min-height:0;padding:0;border-radius:1px;background:var(--muted);border:1px solid var(--ink);z-index:2;touch-action:none}.scene-composer button.keyframe-diamond:hover,.scene-composer button.keyframe-diamond[aria-pressed=true]{background:var(--key);border-color:var(--key);box-shadow:0 0 0 3px var(--key-bg)}
.scene-composer .keyframe-summary{position:absolute;top:50%;width:5px;height:5px;transform:translate(-50%,-50%) rotate(45deg);background:var(--muted);opacity:.6;pointer-events:none}.scene-composer .keyframe-motion{position:absolute;inset:5px 7px;background:repeating-linear-gradient(135deg,var(--select-faint),var(--select-faint) 4px,transparent 4px,transparent 8px);font:11px var(--mono);padding-left:4px;color:var(--muted);pointer-events:none}
.scene-composer button.keyframe-span{position:absolute;top:5px;height:17px;min-height:0;padding:0 5px;overflow:hidden;text-overflow:ellipsis;border-radius:2px;background:#263d51;border:1px solid #45657d;color:var(--ink);font:11px var(--mono);text-align:left}.scene-composer button.keyframe-span.text{background:#34442d;border-color:#576b4d}.scene-composer button.keyframe-span.fade{background:#3e344c;border-color:#665273}.scene-composer button.keyframe-span[aria-pressed=true]{border-color:var(--select);color:var(--select)}

.scene-composer .outline-context{font-size:11px;color:var(--muted);margin:5px 0 10px}.scene-composer .outline-source{padding:0;border-top:1px solid var(--separator);margin:3px 0}.scene-composer .outline-source>summary{font-size:11px;padding:9px 2px;color:var(--ink);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .outline-source .layer-group>summary{font-size:11px}.scene-composer .outline-source>div{padding-bottom:8px}

.scene-composer .render-status{position:absolute;top:12px;left:12px;pointer-events:none;background:var(--overlay);border:1px solid var(--separator);padding:4px 7px;font:11px var(--mono);color:var(--muted);z-index:4}.scene-composer .scene-boundary{position:absolute;border-left:1px dashed var(--muted);border-right:1px dashed var(--muted);pointer-events:none;font:11px var(--mono);color:var(--muted);padding:6px;overflow:hidden;white-space:nowrap}.scene-composer .chunk-boundary-label{display:block;font:11px var(--mono);padding:2px 4px;margin-bottom:2px;cursor:grab;max-width:100%;overflow:hidden;text-overflow:ellipsis}.scene-composer .world-member-group{margin:6px 0}.scene-composer .world-member-group>button{display:block;margin:4px 8px}.scene-composer .scene-boundary.active{border-color:var(--select);color:var(--select)}.scene-composer .outline-source.active-scene>summary:after{content:' · camera';color:var(--muted);font-size:11px}

.scene-composer .sequence-camera-guide{position:absolute;border:1px solid var(--key);color:var(--key);font:11px var(--mono);padding:4px;pointer-events:none;white-space:nowrap;box-shadow:0 0 0 1px #0007;z-index:2}
.scene-composer .chunk-status-badge{font:11px var(--mono);padding:3px 5px;margin:3px 0 3px 6px;color:var(--muted);border:1px solid var(--separator);border-radius:4px;white-space:normal;vertical-align:middle}
.scene-composer .chunk-status-badge[data-mode="editing"]{color:var(--muted)}
.scene-composer .stack-name{flex:1;text-align:left;background:none;border:0;padding:0;min-height:20px;color:inherit;font:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer}
.scene-composer .outline-source>summary{white-space:normal}
.scene-composer .live-residency>:not(h2):not(.runtime-chunks){display:none}
.scene-composer .runtime-chunk{border-top:1px solid var(--separator);padding:5px 0;font-size:11px}
.scene-composer .runtime-chunk ul{padding-left:18px;color:var(--muted);overflow-wrap:anywhere}

.scene-composer input[type=number]{appearance:textfield;-moz-appearance:textfield}
.scene-composer input[type=number]::-webkit-inner-spin-button,.scene-composer input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.scene-composer .animated-property{display:flex;align-items:center;gap:5px;min-width:0;flex:0 1 200px}
.scene-composer .animated-property>input:not([type=checkbox]),.scene-composer .animated-property>select{width:80px;min-width:0;flex:1}
.scene-composer .property-keys{display:inline-flex;align-items:center;flex:none}
.scene-composer .property-keys button{padding:0;width:23px;min-height:26px;border:0;background:transparent;color:var(--muted);font-size:18px}
.scene-composer .property-keys .animated{color:var(--key)}
.scene-composer .property-keys .current{background:var(--raised);border-radius:3px}

.scene-composer .camera-border-hit{position:absolute;pointer-events:auto;background:transparent;border:0;border-radius:0;padding:0;min-height:0;z-index:1}
.scene-composer .camera-border-hit.top,.scene-composer .camera-border-hit.bottom{left:0;width:100%;height:8px}
.scene-composer .camera-border-hit.left,.scene-composer .camera-border-hit.right{top:0;height:100%;width:8px}
.scene-composer .camera-border-hit.top{top:-4px}.scene-composer .camera-border-hit.bottom{bottom:-4px}.scene-composer .camera-border-hit.left{left:-4px}.scene-composer .camera-border-hit.right{right:-4px}

.scene-composer .structured-row{border:1px solid var(--separator);padding:6px;margin:6px 0;border-radius:4px}
.scene-composer .structured-row[data-selected=true]{border-color:var(--select)}
.scene-composer .structured-row-actions{display:flex;align-items:center;gap:4px;margin-bottom:4px}
.scene-composer .structured-row-actions button{min-height:22px;padding:2px 6px}
.scene-composer .spatial-feedback{position:absolute;top:12px;left:12px;z-index:5;pointer-events:none;max-width:calc(100% - 24px);padding:4px 7px;background:var(--panel);border:1px solid var(--select);border-radius:3px;color:var(--ink);font:11px/1.4 var(--mono)}
.scene-composer .spatial-feedback[hidden]{display:none}
.scene-composer label[data-spatial-active=true]{outline:1px solid var(--select);outline-offset:3px;border-radius:2px}

/* Docks: closing, maximising and the left dock's tabs. Layout is a per-workspace view preference. */
.scene-composer .dock-head{display:flex;align-items:stretch;height:32px;margin:-10px -12px 8px;padding:0 4px;border-bottom:1px solid var(--separator);position:sticky;top:-10px;z-index:4;background:var(--panel)}
.scene-composer .dock-head button{min-height:0;height:32px;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--muted);padding:0 12px;font-size:12px}
.scene-composer .dock-head button[aria-selected=true]{color:var(--ink);border-bottom-color:var(--select)}
.scene-composer .workspace>aside .scene-context{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}.scene-composer .workspace>aside .document-picker{flex:1 1 160px;width:auto}
.scene-composer .library-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}.scene-composer .library-list li{display:flex;flex-direction:column;gap:2px;padding:6px 4px;border-bottom:1px solid var(--separator)}
.scene-composer .library-list button{align-self:flex-start}.scene-composer .library-list small{color:var(--faint);font-size:11px;line-height:14px}
.scene-composer .dock-strip{display:none;position:absolute;top:8px;z-index:6;min-height:0;height:26px;padding:0 8px;font-size:12px;background:var(--overlay)}
.scene-composer .dock-strip.left{left:8px}.scene-composer .dock-strip.right{right:8px}
.scene-composer[data-left-closed] .workspace{--left-w:0px!important}.scene-composer[data-left-closed] .workspace>aside:first-of-type,.scene-composer[data-left-closed] .panel-handle.left{display:none}.scene-composer[data-left-closed] .dock-strip.left{display:block}
.scene-composer[data-right-closed] .workspace{--right-w:0px!important}.scene-composer[data-right-closed] .workspace>aside:last-of-type,.scene-composer[data-right-closed] .panel-handle.right{display:none}.scene-composer[data-right-closed] .dock-strip.right{display:block}
.scene-composer[data-maximized=center] .workspace{grid-template-columns:0 minmax(0,1fr) 0}.scene-composer[data-maximized=center] .workspace>aside,.scene-composer[data-maximized=center] .panel-handle,.scene-composer[data-maximized=center] .timeline{display:none}
.scene-composer[data-maximized=left] .workspace{grid-template-columns:minmax(0,1fr) 0 0}.scene-composer[data-maximized=left] .preview-column,.scene-composer[data-maximized=left] .workspace>aside:last-of-type,.scene-composer[data-maximized=left] .panel-handle{display:none}
.scene-composer[data-maximized=right] .workspace{grid-template-columns:0 0 minmax(0,1fr)}.scene-composer[data-maximized=right] .preview-column,.scene-composer[data-maximized=right] .workspace>aside:first-of-type,.scene-composer[data-maximized=right] .panel-handle{display:none}
.scene-composer[data-maximized=timeline] .workspace{grid-template-columns:0 minmax(0,1fr) 0}.scene-composer[data-maximized=timeline] .workspace>aside,.scene-composer[data-maximized=timeline] .panel-handle,.scene-composer[data-maximized=timeline] .preview-options,.scene-composer[data-maximized=timeline] .stage-wrap{display:none}.scene-composer[data-maximized=timeline] .timeline{flex:1;max-height:none}
/* Status bar: mode, context, notices and dock toggles. */
.scene-composer .status-bar{display:flex;align-items:center;gap:14px;height:24px;flex:none;padding:0 10px;background:var(--chrome);border-top:1px solid var(--separator);font-size:11px;line-height:14px;color:var(--muted);white-space:nowrap;overflow:hidden}
.scene-composer .mode-chip{flex:none;font-weight:600;color:var(--ink);letter-spacing:.04em;padding:1px 6px;border-radius:3px}
.scene-composer .mode-chip.sequence{background:var(--key);color:var(--key-ink)}.scene-composer .mode-chip.playing{background:var(--play);color:var(--play-ink)}
.scene-composer .status-context{min-width:0;overflow:hidden;text-overflow:ellipsis}.scene-composer .status-spacer{flex:1}
.scene-composer .status-bar .status{max-width:60ch;overflow:hidden;text-overflow:ellipsis}.scene-composer .status-bar .status:empty{display:none}
.scene-composer .dock-toggles{display:flex;gap:2px}.scene-composer .dock-toggles button{min-height:0;height:20px;padding:0 6px;font-size:11px;border:0;background:none;color:var(--faint)}.scene-composer .dock-toggles button[aria-pressed=true]{color:var(--ink)}
.scene-composer .save-state{color:var(--faint)}

/* Scene toolbar and overlays. Preview-only settings have a dashed bar; menus sit in the scene's corners. */
.scene-composer .crumb{flex:none;max-width:40ch;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .crumb:empty{display:none}
.scene-composer .preview-bar{position:absolute;top:10px;right:10px;z-index:4;display:flex;align-items:center;gap:4px;padding:3px;border:1px dashed var(--control-line);border-radius:6px;background:var(--overlay)}
.scene-composer .preview-bar.stored{border-style:solid}.scene-composer .preview-bar[hidden],.scene-composer .view-menus[hidden]{display:none}
.scene-composer .preview-label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--faint);padding:0 6px;white-space:nowrap}
.scene-composer .preview-bar select,.scene-composer .preview-bar button{min-height:0;height:26px;font-size:12px}
.scene-composer .view-menus{position:absolute;right:12px;bottom:12px;z-index:3;display:flex;gap:4px}
.scene-composer details.ov-menu{position:relative;margin:0;padding:0;border:0}
.scene-composer .ov-menu>summary{list-style:none;display:flex;align-items:center;height:28px;padding:0 10px;border:1px solid var(--separator);border-radius:6px;background:var(--overlay);color:var(--ink);font:12px/16px var(--sans);cursor:pointer}
.scene-composer .ov-menu>summary::-webkit-details-marker{display:none}.scene-composer .ov-menu>summary::after{content:'▾';margin-left:6px;color:var(--muted)}.scene-composer .ov-menu[open]>summary{border-color:var(--control-line)}
.scene-composer .ov-menu-panel{position:absolute;right:0;bottom:calc(100% + 6px);z-index:20;width:300px;max-height:60vh;overflow:auto;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:8px;background:var(--panel);border:1px solid var(--control-line);border-radius:6px;box-shadow:0 10px 30px #0009}
.scene-composer .ov-menu-panel button{text-align:left}.scene-composer .ov-menu-panel label{margin:2px 0}
.scene-composer .ov-menu-extra{display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--separator);padding-top:6px;margin-top:2px}.scene-composer .ov-menu-extra:empty{display:none}
.scene-composer .mode-banner{position:absolute;left:0;right:0;top:0;height:28px;z-index:6;display:flex;align-items:center;gap:10px;padding:0 10px;font-size:12px}
.scene-composer .mode-banner[hidden]{display:none}.scene-composer .mode-banner.sequence{background:var(--key);color:var(--key-ink)}.scene-composer .mode-banner.playing{background:var(--play);color:var(--play-ink)}
.scene-composer .mode-banner span{font-weight:500}.scene-composer .mode-banner button{min-height:0;height:22px;padding:0 8px;background:rgba(0,0,0,.14);border:0;color:inherit;font-size:12px}
.scene-composer .stage-wrap[data-banner] .preview-bar,.scene-composer .stage-wrap[data-banner] .render-status{top:38px}
.scene-composer .stage-wrap::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:7;box-shadow:inset 0 0 0 2px var(--frame,transparent)}
.scene-composer[data-mode=sequence] .stage-wrap{--frame:var(--key)}.scene-composer[data-mode=playing] .stage-wrap{--frame:var(--play)}
.scene-composer .pick-list{position:absolute;z-index:30;min-width:200px;max-width:240px;max-height:300px;overflow:auto;display:flex;flex-direction:column;padding:4px;background:var(--panel);border:1px solid var(--control-line);border-radius:6px;box-shadow:0 10px 30px #0009}
.scene-composer .pick-list[hidden]{display:none}.scene-composer .pick-list button{text-align:left;border:0;background:none;font:12px/16px var(--mono)}.scene-composer .pick-list button:hover{background:var(--raised)}.scene-composer .pick-list button[aria-pressed=true]{color:var(--select)}
.scene-composer .pick-head{font-size:11px;color:var(--faint);padding:4px 8px}
.scene-composer .inspector-head{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap}.scene-composer .inspector-head .identity{flex:1;min-width:0}.scene-composer .inspector-head .kind{font-size:12px;line-height:16px;color:var(--muted);margin-top:2px}.scene-composer .inspector-head .kind button{min-height:0;height:20px;padding:0 6px;font-size:11px}
.scene-composer .inspector-head .identity-actions{display:flex;gap:4px;margin:0;flex:none}.scene-composer button.icon{width:28px;min-width:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:14px}
.scene-composer .changed>input,.scene-composer .changed>select,.scene-composer .changed>.animated-property>input,.scene-composer .changed>.searchable-select>select{box-shadow:inset 3px 0 0 var(--changed)}
.scene-composer button.reset-field{flex:none;min-height:0;height:22px;width:22px;padding:0;border:0;background:none;color:var(--changed);font-size:12px}
.scene-composer .searchable-select{display:inline-flex;gap:4px;min-width:0;flex:0 1 auto;align-items:center}.scene-composer .searchable-select>.select-search{width:84px;flex:none}.scene-composer .searchable-select>select{min-width:0;flex:1}
.scene-composer label>.searchable-select{width:130px}.scene-composer .inspector-mount label>.searchable-select,.scene-composer .inspector-task label>.searchable-select{width:100%}
.scene-composer details.about-notes{margin-top:14px;border-top:1px solid var(--separator);padding-top:8px}.scene-composer details.about-notes>summary{color:var(--muted);font-weight:500}.scene-composer details.about-notes p{color:var(--muted);font-size:12px}
.scene-composer .inspector-task-actions{position:sticky;bottom:-10px;align-items:center;background:var(--panel);border-top:1px solid var(--separator);padding:10px 0;margin-top:14px}.scene-composer .draft-label{margin-right:auto;color:var(--draft);font-weight:600;font-size:12px}
.scene-composer p.provenance{margin:-2px 0 8px;font-size:11px;line-height:14px;color:var(--muted)}.scene-composer p.provenance.inherited{font-style:italic}.scene-composer p.provenance.override{color:var(--changed)}
/* Outline rows show their eye only on hover, focus, or when the row is hidden. */
.scene-composer .hierarchy li .eye{opacity:0}.scene-composer .hierarchy li:hover .eye,.scene-composer .hierarchy li:focus-within .eye,.scene-composer .hierarchy .eye[data-off=true]{opacity:1}
.scene-composer .outline-source>summary[title*=double-click]{cursor:pointer}
/* Library dock: the artwork browser in one column, then the larger library screens. */
.scene-composer .library-dock .asset-browser-grid,.scene-composer .library-dock .asset-browser-grid:has(.asset-grid),.scene-composer .library-dock .asset-browser-grid.with-districts{grid-template-columns:1fr;gap:8px}
.scene-composer .library-dock .asset-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.scene-composer .library-dock canvas.asset-thumb{height:64px}.scene-composer .library-dock .asset-card[draggable=true]{cursor:grab}
.scene-composer .library-hint{font-size:11px;color:var(--faint);margin:0 0 6px}
.scene-composer .stage-wrap[data-dropping]::after{box-shadow:inset 0 0 0 2px var(--select)}
/* Command search (Ctrl K). */
.scene-composer .command-search{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:flex-start;padding-top:72px}.scene-composer .command-search[hidden]{display:none}
.scene-composer .command-dialog{width:640px;max-width:calc(100vw - 32px);max-height:70vh;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--control-line);border-radius:10px;box-shadow:0 18px 60px rgba(0,0,0,.6);overflow:hidden}
.scene-composer .command-dialog>input{min-height:0;height:48px;border:0;border-bottom:1px solid var(--separator);border-radius:0;background:transparent;padding:0 16px;font-size:14px}
.scene-composer .command-results{overflow:auto;padding:4px 0}.scene-composer .command-group{font-size:11px;font-weight:600;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;padding:10px 16px 4px}
.scene-composer button.command-row{display:flex;align-items:center;gap:10px;width:100%;min-height:0;height:34px;padding:0 16px;border:0;border-radius:0;background:none;text-align:left}
.scene-composer button.command-row[aria-selected=true]{background:var(--select-bg);box-shadow:inset 2px 0 0 var(--select)}.scene-composer .command-label{flex:none;max-width:55%;overflow:hidden;text-overflow:ellipsis}
.scene-composer .command-where{flex:1;min-width:0;color:var(--muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scene-composer .command-row kbd,.scene-composer .search-button kbd{font:11px var(--mono);color:var(--faint);border:1px solid var(--separator);border-radius:3px;padding:0 4px}
.scene-composer .command-empty{padding:16px;color:var(--muted)}.scene-composer .command-foot{height:32px;display:flex;align-items:center;padding:0 16px;border-top:1px solid var(--separator);font-size:11px;color:var(--faint)}
/* Sequence editing keeps to animation: composition structure, chunk labels and connection tags wait in base editing. */
.scene-composer[data-mode=sequence] .structure,.scene-composer[data-mode=sequence] .chunk-boundary-label,.scene-composer[data-mode=sequence] .world-connection-guide{display:none}
/* Inspector fields: one label column, right-aligned on one line; values line up; reset and key buttons in a narrow third column. */
.scene-composer .workspace>.inspector-dock label{display:grid;grid-template-columns:var(--label-col,112px) minmax(0,1fr) auto;align-items:center;column-gap:8px;row-gap:0;margin:2px 0;min-height:26px;justify-content:stretch;text-align:left;flex-direction:row}
.scene-composer .workspace>.inspector-dock label>span:first-child{grid-column:1;justify-self:end;max-width:100%;color:var(--muted);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.scene-composer .workspace>.inspector-dock label>span:first-child+*{grid-column:2;width:100%;min-width:0;margin:0}
.scene-composer .workspace>.inspector-dock label>span:first-child+input[type=checkbox]{width:auto;justify-self:start}
.scene-composer .workspace>.inspector-dock label>span:first-child+*+*{grid-column:3}
.scene-composer .workspace>.inspector-dock label:has(>span:first-child+input[type=checkbox]){display:grid;grid-template-columns:var(--label-col,112px) auto minmax(0,1fr)}
.scene-composer .workspace>.inspector-dock label>span:first-child:has(+input[type=checkbox]){grid-column:3;grid-row:1;justify-self:start;text-align:left;color:var(--ink)}
.scene-composer .workspace>.inspector-dock label>span:first-child+input[type=checkbox]{grid-column:2;grid-row:1}
/* Editor errors: a red chip in the status bar; the list opens above it with each error's details. */
.scene-composer button.error-chip{min-height:0;height:20px;max-width:420px;padding:0 8px;border:1px solid var(--error);border-radius:3px;background:rgba(255,128,128,.12);color:var(--error);font:600 11px/18px var(--sans);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scene-composer button.error-chip[hidden]{display:none}
.scene-composer .error-list{position:fixed;right:12px;bottom:32px;z-index:50;width:560px;max-height:60vh;overflow:auto;padding:8px;background:var(--panel);border:1px solid var(--error);border-radius:6px;box-shadow:0 10px 30px #0009}
.scene-composer .error-list[hidden]{display:none}.scene-composer .error-list-head{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.scene-composer .error-row summary{cursor:pointer;color:var(--error);font-size:12px;padding:4px 0}.scene-composer .error-row pre{margin:4px 0 8px;padding:8px;max-height:200px;overflow:auto;background:var(--field);border-radius:3px;font:11px/1.4 var(--mono);color:var(--muted);white-space:pre-wrap}
`;
