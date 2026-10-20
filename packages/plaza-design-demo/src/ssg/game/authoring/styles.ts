export const composerStyles = `
.scene-composer{--bg:#0b1017;--panel:#121a25;--raised:#18222f;--field:#0d141d;--line:#263346;--line-strong:#3a4b63;--ink:#e3eaf3;--muted:#8fa2b9;--accent:#72dbca;--accent-ink:#06211d;--warn:#ffd27a;--danger:#ff9c9c;--mono:'IBM Plex Mono',ui-monospace,monospace;
  color:var(--ink);background:var(--bg);font:13px/1.45 system-ui,sans-serif;height:100%;min-height:560px;display:flex;flex-direction:column}
.scene-composer *{box-sizing:border-box}
.scene-composer button,.scene-composer input,.scene-composer select,.scene-composer textarea{font:inherit;color:inherit;background:var(--field);border:1px solid var(--line);border-radius:4px;padding:5px 8px;min-width:0;min-height:30px}
.scene-composer button{cursor:pointer;background:var(--raised);white-space:nowrap}.scene-composer button:hover:not(:disabled){border-color:var(--accent)}.scene-composer button:disabled{opacity:.4;cursor:default}
.scene-composer button.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}.scene-composer button.primary:disabled{background:var(--raised);border-color:var(--line);color:var(--muted);opacity:1}
.scene-composer input[type=checkbox]{min-height:0;width:16px;height:16px;accent-color:var(--accent)}
.scene-composer :focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.scene-composer h2{font:600 11px/1.3 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:16px 0 8px}.scene-composer aside>h2:first-child{margin-top:4px}
.scene-composer h3{font:600 11px/1.3 var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:14px 0 6px}.scene-composer p{margin:5px 0}.scene-composer .muted{color:var(--muted)}
.scene-composer details{border-top:1px solid var(--line);padding-top:8px;margin-top:10px}.scene-composer summary{cursor:pointer;color:var(--accent);font-family:var(--mono);font-size:12px;padding:2px 0}
.scene-composer .gameplay-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.scene-composer .gameplay-layout>section{min-width:0}.scene-composer .gameplay-layout pre{white-space:pre-wrap;overflow-wrap:anywhere}
.scene-composer .gameplay-fields{display:grid;gap:8px;padding:8px 0}.scene-composer .gameplay-fields label{display:grid;gap:4px;min-width:0}
.scene-composer .gameplay-fields input,.scene-composer .gameplay-fields select,.scene-composer .gameplay-fields textarea{width:100%;max-width:100%}
.scene-composer .gameplay-fields textarea{min-height:100px;resize:vertical}.scene-composer .gameplay-condition{min-width:0;border:1px solid var(--line);border-radius:4px;display:grid;gap:6px}
.scene-composer .gameplay-editor .row,.scene-composer .gameplay-lab>div{display:flex;gap:6px;flex-wrap:wrap}
.scene-composer .logic-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:28px;align-items:start}
.scene-composer .logic-nav{position:sticky;top:0;max-height:calc(100vh - 150px);overflow:auto;display:flex;flex-direction:column;gap:1px;padding-right:10px;border-right:1px solid var(--line)}.scene-composer .logic-nav h3{flex:none;margin:14px 0 4px}.scene-composer .logic-nav h3:first-child{margin-top:0}
.scene-composer .logic-nav button{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;white-space:normal;border:0;border-left:2px solid transparent;border-radius:0;background:none;padding:5px 10px;min-height:0}.scene-composer .logic-nav button small{color:var(--muted);font-size:11px}
.scene-composer .logic-nav button:hover{background:var(--raised)}.scene-composer .logic-nav button[aria-pressed=true]{border-left-color:var(--accent);background:var(--raised);color:var(--accent)}
.scene-composer .logic-detail{max-width:760px;min-width:0}.scene-composer .logic-detail>h2{margin-top:0;font-size:12px;color:var(--ink)}
.scene-composer .logic-detail label{display:grid;gap:4px;justify-content:stretch;margin:10px 0}.scene-composer .logic-detail label:has(>input[type=checkbox]){display:flex;justify-content:start;gap:10px}.scene-composer .logic-detail label>input:not([type=checkbox]),.scene-composer .logic-detail label>select,.scene-composer .logic-detail textarea{width:100%;max-width:100%}
.scene-composer .logic-detail textarea{min-height:90px}.scene-composer .gameplay-condition{padding:8px 12px 10px;margin:10px 0}.scene-composer .gameplay-condition>legend{padding:0 6px;color:var(--muted);font-size:12px}.scene-composer .gameplay-condition label{margin:4px 0}
.scene-composer .logic-detail details>summary{font-size:12px}.scene-composer .logic-detail details{margin-top:12px}
@media(max-width:1000px){.scene-composer .gameplay-layout{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.scene-composer .logic-layout{grid-template-columns:1fr;gap:12px}.scene-composer .logic-nav{position:static;max-height:38vh;border-right:0;border-bottom:1px solid var(--line);padding:0 0 8px}}

/* Top bar */
.scene-composer>header{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line);background:var(--panel)}
.scene-composer .brand{display:flex;align-items:baseline;gap:6px;font-family:var(--mono);white-space:nowrap}.scene-composer .brand strong{color:var(--accent);letter-spacing:.06em}.scene-composer .brand span{color:var(--muted)}
.scene-composer .document-picker{flex:0 1 280px;font-family:var(--mono);font-size:12px}
.scene-composer .state{font-family:var(--mono);font-size:11px;white-space:nowrap}.scene-composer .state.dirty::before{content:'● ';color:var(--warn)}
.scene-composer .actions{margin-left:auto;display:flex;align-items:center;gap:6px}
.scene-composer .menu{position:relative;border:0;padding:0;margin:0}.scene-composer .menu>summary{list-style:none;color:var(--ink);font:inherit;border:1px solid var(--line);background:var(--raised);border-radius:4px;padding:5px 10px;min-height:30px;display:flex;align-items:center}.scene-composer .menu>summary::-webkit-details-marker{display:none}.scene-composer .menu>summary::after{content:'▾';margin-left:6px;color:var(--muted)}.scene-composer .menu[open]>summary{border-color:var(--accent)}
.scene-composer .menu-items{position:absolute;right:0;top:calc(100% + 4px);z-index:20;min-width:180px;display:flex;flex-direction:column;padding:4px;background:var(--raised);border:1px solid var(--line-strong);border-radius:6px;box-shadow:0 10px 30px #0009}.scene-composer .menu-items button{border:0;background:none;text-align:left;padding:8px 10px}.scene-composer .menu-items button:hover:not(:disabled){background:#22303f}

/* Tool tabs */
.scene-composer .tools{display:flex;gap:2px;padding:0 8px;border-bottom:1px solid var(--line);background:var(--panel);overflow-x:auto;scrollbar-width:none}.scene-composer .tools::-webkit-scrollbar{display:none}
.scene-composer .tools button{flex:none;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--muted);padding:8px 12px;font-family:var(--mono);font-size:12px}.scene-composer .tools button:hover{color:var(--ink)}.scene-composer .tools button[aria-pressed=true]{color:var(--accent);border-bottom-color:var(--accent)}
.scene-composer .tools .secondary{margin-left:auto}.scene-composer .tools .secondary~button{margin-left:0}
.scene-composer .subtools{display:flex;gap:4px;padding:6px 12px;border-bottom:1px solid var(--line);background:var(--bg);overflow-x:auto;scrollbar-width:none}.scene-composer .subtools[hidden]{display:none}
.scene-composer .subtools button{flex:none;min-height:26px;padding:3px 12px;border-radius:999px;background:none;color:var(--muted);font-size:12px}.scene-composer .subtools button[aria-pressed=true]{color:var(--accent-ink);background:var(--accent);border-color:var(--accent)}
.scene-composer .empty-state{max-width:560px;margin:48px auto;padding:0 16px}.scene-composer .empty-state h2{margin-top:0}.scene-composer .empty-state p{font-size:14px}.scene-composer .empty-state .row>button{flex:0 0 auto}
.scene-composer .status{padding:5px 12px;font-size:12px;border-bottom:1px solid var(--line);color:var(--muted)}.scene-composer .status:empty{display:none}.scene-composer .status.error{color:#ffc8c8;background:#3a1f2c}
.scene-composer .tool-panel{margin:0;padding:0;border:0;flex:1;min-height:0;overflow:auto}.scene-composer .tool-panel:not([open]){display:none}.scene-composer .tool-panel>summary{display:none}
.scene-composer .tool-panel>section,.scene-composer .tool-panel>div{padding:12px 16px}
.scene-composer:not([data-tool=scene]) .workspace{display:none}

/* Workspace */
.scene-composer,.scene-composer *{scrollbar-width:thin;scrollbar-color:var(--line-strong) transparent}.scene-composer ::-webkit-scrollbar{width:10px;height:10px}.scene-composer ::-webkit-scrollbar-track{background:transparent}.scene-composer ::-webkit-scrollbar-thumb{background:var(--line-strong);border:3px solid transparent;border-radius:6px;background-clip:padding-box}.scene-composer ::-webkit-scrollbar-thumb:hover{background:var(--muted);background-clip:padding-box}.scene-composer ::-webkit-scrollbar-corner{background:transparent}
.scene-composer .workspace{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:var(--left-w,240px) minmax(0,1fr) var(--right-w,340px);grid-template-areas:'left center right'}.scene-composer .panel-handle{position:absolute;top:0;bottom:0;width:7px;z-index:5;cursor:col-resize;touch-action:none}.scene-composer .panel-handle.left{left:calc(var(--left-w,240px) - 4px)}.scene-composer .panel-handle.right{right:calc(var(--right-w,340px) - 4px)}.scene-composer .panel-handle:hover,.scene-composer .panel-handle.dragging{background:linear-gradient(90deg,transparent 2px,var(--accent) 2px,var(--accent) 4px,transparent 4px)}
.scene-composer .preview-column{grid-area:center;min-width:0;min-height:0;display:flex;flex-direction:column}
.scene-composer .workspace>aside{padding:10px 12px;overflow:auto;background:var(--panel);min-height:0}.scene-composer .workspace>aside:first-of-type{grid-area:left;border-right:1px solid var(--line)}.scene-composer .workspace>aside:last-of-type{grid-area:right;border-left:1px solid var(--line)}
.scene-composer .panel-switch{display:none}
.scene-composer .workspace>aside>details:first-child{border-top:0;margin-top:0;padding-top:0}.scene-composer label:has(>input[type=checkbox]){flex-wrap:nowrap}
.scene-composer .preview-options{border-bottom:1px solid var(--line);background:var(--panel)}
.scene-composer .preview-options .quick{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;padding:6px 10px}.scene-composer .preview-options .quick label{margin:0;justify-content:start}.scene-composer .preview-options .quick input[type=number]{width:72px}
.scene-composer .frame-step{display:flex;gap:4px}
.scene-composer .preview-options .environment{margin:0;padding:0 10px 6px;border-top:1px solid var(--line)}.scene-composer .preview-options .environment>summary{padding:6px 0 0}
.scene-composer .environment-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 16px;padding-top:6px}.scene-composer .environment-grid label{margin:2px 0}.scene-composer .environment-grid label.wide{grid-column:span 2}.scene-composer .environment-grid label>input:not([type=checkbox]),.scene-composer .environment-grid label>select{width:auto;flex:0 1 120px}.scene-composer .environment-grid label.wide>input{flex-basis:220px}
.scene-composer .stage-wrap{position:relative;flex:1;min-height:200px;overflow:hidden}
.scene-composer .preview-stage{position:absolute;inset:0;overflow:auto;display:grid;align-items:safe center;justify-items:safe center;background:#05080c;container-type:size;padding:8px;overscroll-behavior:contain}
.scene-composer .preview-stage>canvas[data-hover=artwork]{cursor:pointer}.scene-composer .preview-stage>canvas[data-hover=selected]{cursor:move}.scene-composer .preview-stage>canvas[data-hover=empty]{cursor:grab}.scene-composer .preview-stage>canvas[data-panning]{cursor:grabbing}
.scene-composer .stage-play{position:absolute;inset:0;overflow:auto;padding:8px 12px;background:var(--bg)}.scene-composer .stage-play[hidden],.scene-composer .preview-stage[hidden]{display:none}
.scene-composer .preview-stage.comparing{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.scene-composer .preview-stage.comparing>canvas{width:min(50cqw - 12px,(100cqh - 16px) * var(--fit-ratio,var(--ratio,1.7778)))}.scene-composer .preview-stage>canvas.compare{pointer-events:none}.scene-composer .preview-stage>canvas[hidden]{display:none}
.scene-composer .hover-box{position:absolute;pointer-events:none;outline:1px solid #ffd27acc;outline-offset:1px}.scene-composer .hover-box[hidden]{display:none}
.scene-composer .hover-box[data-below]::after{bottom:auto;top:calc(100% + 3px)}.scene-composer .hover-box[data-right]::after{left:auto;right:-2px}
.scene-composer .hover-box::after{content:attr(data-label);position:absolute;left:-2px;bottom:calc(100% + 3px);font:11px/1.4 var(--mono);background:#10151df0;color:var(--warn);padding:1px 6px;border-radius:3px;white-space:nowrap}
.scene-composer .viewport-tools{position:absolute;right:12px;bottom:12px;z-index:3;display:flex;gap:2px;padding:3px;background:#10151de6;border:1px solid var(--line);border-radius:6px}.scene-composer .viewport-tools[hidden]{display:none}
.scene-composer .viewport-tools button{min-height:26px;padding:2px 9px;border-color:transparent;background:none;font-family:var(--mono);font-size:12px}.scene-composer .viewport-tools .zoom-level{min-width:56px}.scene-composer .viewport-tools button[aria-pressed=true]{color:var(--accent);border-color:var(--line-strong)}
.scene-composer canvas{display:block;max-width:100%;image-rendering:pixelated;touch-action:none}
.scene-composer .preview-stage>canvas{width:min(100cqw - 16px,(100cqh - 16px) * var(--fit-ratio,var(--ratio,1.7778)));height:auto;box-shadow:0 0 0 1px var(--line)}
.scene-composer .preview-error{position:absolute;inset:20px auto auto 20px;max-width:85%;padding:10px;background:#3a1f2c;color:#ffc0c0;white-space:pre-wrap}.scene-composer .preview-error[hidden]{display:none}
.scene-composer .timeline{border-top:1px solid var(--line);padding:9px 12px;max-height:40%;overflow:auto;background:var(--panel)}.scene-composer .timeline:empty{display:none}.scene-composer .timeline input[type=range]{flex:1;min-width:100px}.scene-composer .timeline .time{font-variant-numeric:tabular-nums;white-space:nowrap}.scene-composer .timeline-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Scene toolbar */
.scene-composer .scene-toolbar{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;padding:6px 10px}
.scene-composer .toolbar-group{display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0;max-width:100%}.scene-composer .toolbar-label{color:var(--muted);font-size:12px;margin-right:2px}
.scene-composer .scene-toolbar .time{font:12px/1 var(--mono);color:var(--muted);min-width:44px;text-align:right;font-variant-numeric:tabular-nums}
.scene-composer .scene-toolbar select{font-size:12px;max-width:100%}
.scene-composer .toggle[aria-pressed=true],.scene-composer .scene-toolbar button[aria-pressed=true]{color:var(--accent);border-color:var(--accent);background:#173238}
.scene-composer .segmented button[aria-pressed=true]{background:#173238}
.scene-composer .play-button{margin-left:auto;border-color:var(--accent);color:var(--accent)}
.scene-composer .more-menu{position:relative;border:0;margin:0;padding:0}.scene-composer .more-menu>summary{list-style:none;color:var(--ink);font:12px/1.45 system-ui,sans-serif;border:1px solid var(--line);background:var(--raised);border-radius:4px;padding:5px 10px;min-height:30px;display:flex;align-items:center}.scene-composer .more-menu>summary::-webkit-details-marker{display:none}.scene-composer .more-menu>summary::after{content:'▾';margin-left:6px;color:var(--muted)}.scene-composer .more-menu[open]>summary{border-color:var(--accent)}
.scene-composer .more-panel{position:absolute;left:0;top:calc(100% + 4px);z-index:20;width:min(380px,80vw);max-height:60vh;overflow:auto;padding:8px 12px;background:var(--raised);border:1px solid var(--line-strong);border-radius:6px;box-shadow:0 10px 30px #0009}
.scene-composer .more-panel label>input:not([type=checkbox]),.scene-composer .more-panel label>select{width:170px}.scene-composer .more-panel label.wide{flex-wrap:wrap}.scene-composer .more-panel label.wide>input{width:100%}

/* Add picker and artwork tiles */
.scene-composer .add-picker{position:absolute;inset:10px;z-index:6;display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#0f1620f5;border:1px solid var(--line-strong);border-radius:8px;box-shadow:0 14px 40px #000c}.scene-composer .add-picker[hidden]{display:none}
.scene-composer .picker-head{display:flex;align-items:center;gap:8px}.scene-composer .picker-head input[type=search]{flex:1}.scene-composer .picker-head strong{font:600 12px var(--mono);color:var(--accent);white-space:nowrap}
.scene-composer .picker-grid{flex:1;min-height:0;overflow:auto;display:grid;grid-auto-rows:max-content;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;align-content:start}
.scene-composer .asset-card{display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:6px;white-space:normal;text-align:left;background:var(--field);min-height:0}.scene-composer .asset-card span{font-size:12px;line-height:1.3;overflow-wrap:anywhere}.scene-composer .asset-card small{color:var(--accent);font-size:10px}
.scene-composer .asset-card[aria-pressed=true]{border-color:var(--accent);background:#173238}
.scene-composer canvas.asset-thumb{width:100%;height:84px;flex:none;object-fit:contain;background:#05080c;border-radius:3px;image-rendering:pixelated}.scene-composer canvas.asset-thumb[data-empty]{background:repeating-linear-gradient(45deg,#0a0f15 0 6px,#0d141c 6px 12px)}
.scene-composer .asset-grid{display:grid;grid-auto-rows:max-content;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;align-content:start}
.scene-composer .asset-browser-grid:has(.asset-grid){grid-template-columns:minmax(0,1fr) minmax(320px,38%)}.scene-composer .asset-browser-grid:has(.asset-grid) .catalog-list{max-height:calc(100vh - 260px)}
.scene-composer .asset-browser-grid.with-districts,.scene-composer .asset-browser-grid.with-districts:has(.asset-grid){grid-template-columns:150px minmax(0,1fr) minmax(320px,36%)}
.scene-composer .district-bar{display:flex;flex-direction:column;gap:4px;align-content:start}.scene-composer .district-bar .chip{display:flex;justify-content:space-between;width:100%;text-align:left;font-size:12px;padding:5px 8px;border-radius:999px;background:var(--field)}.scene-composer .district-bar .chip[aria-pressed=true]{border-color:var(--accent);background:#173238;color:var(--ink,inherit)}.scene-composer .district-bar .chip:disabled{opacity:.4}.scene-composer .district-bar .chip{gap:6px}.scene-composer .district-bar .chip span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .district-bar .chip small{flex:none;color:var(--muted)}
.scene-composer .style-frames{display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px;padding:4px 0}.scene-composer .style-frame{display:grid;gap:10px;min-width:0;align-content:start}.scene-composer .style-frame h3{margin:0}.scene-composer .style-frame .motto{margin:2px 0 0;font-style:italic;color:#ffd9a5}
.scene-composer .style-frame .swatches{display:flex;gap:4px;max-width:420px}.scene-composer .style-frame .swatches span{flex:1;height:14px;border-radius:2px}
.scene-composer .frame-body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;align-items:start}.scene-composer .frame-body canvas{width:100%;height:auto;background:#05080c;display:block;margin-top:8px}.scene-composer .frame-body .toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.scene-composer .frame-strip{position:sticky;bottom:0;z-index:3;display:grid;grid-auto-flow:column;grid-auto-columns:150px;gap:8px;overflow-x:auto;margin-top:10px;padding:8px 0;background:var(--bg);border-top:1px solid var(--line);box-shadow:0 -8px 16px #0008}.scene-composer .frame-strip canvas{margin:0}
@media(max-width:1200px){.scene-composer .frame-body{grid-template-columns:minmax(0,1fr)}}
.scene-composer .frame-compare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.scene-composer .frame-compare figure{margin:0;min-width:0}.scene-composer .frame-compare h3{margin:8px 0 0}
.scene-composer .style-frame dl{display:grid;grid-template-columns:80px minmax(0,1fr);gap:6px 10px;margin:0;font-size:13px}.scene-composer .style-frame dt{color:var(--muted);font:600 11px/1.5 var(--mono);text-transform:uppercase;letter-spacing:.05em}.scene-composer .style-frame dd{margin:0}
.scene-composer .asset-browser-grid .primary{margin:6px 0 10px}

/* Inspector */
.scene-composer .inspector-head h2{font:600 13px/1.3 var(--mono);text-transform:none;letter-spacing:0;color:var(--ink);margin:2px 0 2px;overflow-wrap:anywhere}.scene-composer .inspector-head .row{margin-top:8px}
.scene-composer .inspector-tabs{display:flex;gap:2px;margin:10px -12px 0;padding:0 8px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
.scene-composer .inspector-tabs button{flex:none;border:0;border-bottom:2px solid transparent;border-radius:0;background:none;color:var(--muted);padding:6px 10px;font-family:var(--mono);font-size:12px}.scene-composer .inspector-tabs button[aria-selected=true]{color:var(--accent);border-bottom-color:var(--accent)}
.scene-composer .inspector-body>p:first-child{margin-top:10px}
.scene-composer .inspector-part>summary,.scene-composer .inspector-section>summary{font-size:12px}
.scene-composer .inspector-mount .logic-detail{max-width:none}.scene-composer .inspector-mount .logic-detail label,.scene-composer .inspector-mount .gameplay-fields label{display:grid;gap:4px;justify-content:stretch}.scene-composer .inspector-mount label>input:not([type=checkbox]),.scene-composer .inspector-mount label>select,.scene-composer .inspector-mount textarea{width:100%}
.scene-composer .inspector-mount label:has(>input[type=checkbox]){display:flex;justify-content:start}
.scene-composer .world-map canvas{max-width:1100px}

/* Forms and lists */
.scene-composer .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.scene-composer .row>*{flex:1}.scene-composer .row>button{flex:0 1 auto}
.scene-composer label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0}.scene-composer label>span{color:var(--muted)}.scene-composer label>input:not([type=checkbox]),.scene-composer label>select{width:130px}.scene-composer label>input[type=checkbox]{margin-right:auto}
.scene-composer textarea{display:block;width:100%;min-height:95px;resize:vertical;font:12px/1.5 var(--mono);tab-size:2}
.scene-composer .hierarchy{list-style:none;margin:0 -6px;padding:0}.scene-composer .hierarchy button{display:block;width:100%;text-align:left;margin:0;border:0;border-left:2px solid transparent;border-radius:0;background:none;min-height:28px;padding:4px 10px;font:12px/1.4 var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .hierarchy button:hover{background:var(--raised)}.scene-composer .hierarchy button[aria-pressed=true]{border-left-color:var(--accent);background:#173238;color:var(--accent)}
.scene-composer .layers>.hierarchy{margin-top:6px}.scene-composer .catalog-list{max-height:320px;overflow:auto}.scene-composer .catalog-group{border:0;margin:0;padding:2px 0}.scene-composer .catalog-group>button{display:block;width:100%;text-align:left;margin:1px 0;border-color:transparent;background:none;font-size:12px}.scene-composer .catalog-group>button:hover{background:var(--raised)}
.scene-composer .layer-tools{display:flex;gap:6px;align-items:center;margin:6px 0}.scene-composer .layer-tools input[type=search]{flex:1;width:auto}
.scene-composer .segmented{display:flex}.scene-composer .segmented button{border-radius:0;padding:4px 8px;font-size:11px;font-family:var(--mono)}.scene-composer .segmented button:first-child{border-radius:4px 0 0 4px}.scene-composer .segmented button:last-child{border-radius:0 4px 4px 0;border-left:0}.scene-composer .segmented button[aria-pressed=true]{color:var(--accent);border-color:var(--accent)}
.scene-composer .layer-group{margin-top:4px;padding-top:4px}.scene-composer .layer-group>summary{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.scene-composer .layer-group>summary:hover{color:var(--ink)}
.scene-composer .layer-stack{display:flex;flex-direction:column;gap:2px;margin-top:4px}.scene-composer .stack-layer{border-top:1px solid var(--line);padding-top:2px}.scene-composer .stack-head{display:flex;justify-content:space-between;padding:4px 4px 2px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink);cursor:default}.scene-composer .engine-layer{margin:1px 0;padding:3px 8px;border:1px dashed var(--line);border-radius:3px;font:11px/1.4 system-ui,sans-serif;color:var(--muted);opacity:.75;cursor:default;user-select:none}.scene-composer .hierarchy li[draggable=true]{cursor:grab}.scene-composer .hierarchy li.dragging{opacity:.4}.scene-composer .drop-target{box-shadow:inset 0 2px 0 var(--accent)}.scene-composer .stack-head.drop-target{background:var(--raised)}.scene-composer .player-row button{color:var(--accent);font-weight:600}.scene-composer .hierarchy li{display:flex;align-items:center}.scene-composer .hierarchy li>button:not(.eye){flex:1;min-width:0}.scene-composer .eye,.scene-composer .hierarchy .eye{flex:none;display:inline-flex!important;align-items:center;justify-content:center;width:22px!important;min-width:22px;min-height:22px;margin:0;padding:0!important;border:0!important;background:none!important;color:var(--muted);cursor:pointer}.scene-composer .eye:hover{color:var(--ink)}.scene-composer .eye[data-off=true]{color:var(--warn)}.scene-composer .hierarchy li.is-hidden>button:not(.eye){opacity:.45}.scene-composer .stack-head{align-items:center;gap:4px}.scene-composer .stack-name{flex:1}.scene-composer .fold{flex:none;width:18px;min-height:20px;margin:0;padding:0;border:0;background:none;color:var(--muted);font-size:11px;cursor:pointer}.scene-composer .fold:hover{color:var(--ink)}.scene-composer .eye-space{flex:none;width:22px}.scene-composer details.logic-group>summary .eye{float:right;min-height:18px}.scene-composer .show-all{font-size:11px;padding:2px 6px;white-space:nowrap}.scene-composer .stack-empty{padding:2px 10px;font:11px/1.4 system-ui,sans-serif;color:var(--muted);opacity:.7}
.scene-composer .hierarchy button{display:flex!important;align-items:baseline;justify-content:space-between;gap:8px}.scene-composer .layer-name{overflow:hidden;text-overflow:ellipsis}.scene-composer .layer-kind{flex:0 1 auto;max-width:55%;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font:11px/1.4 system-ui,sans-serif;opacity:.8}.scene-composer .catalog-list>button{display:block;width:100%;text-align:left;margin:2px 0;border-color:transparent;background:none}.scene-composer .catalog-list>button:hover{background:var(--raised)}
.scene-composer .binding-row{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.scene-composer .binding-row code{font:11px/1.4 var(--mono);color:var(--ink);overflow-wrap:anywhere;text-align:right}
.scene-composer .tool-panel label{justify-content:flex-start;gap:12px}.scene-composer .tool-panel label>input:not([type=checkbox]),.scene-composer .tool-panel label>select{width:auto;min-width:140px}
.scene-composer .debug-drawer{margin-top:14px}.scene-composer .debug-drawer>summary{color:var(--muted)}.scene-composer .debug-drawer pre{font:11px/1.45 var(--mono);background:var(--field);border:1px solid var(--line);border-radius:4px;padding:8px}
.scene-composer .danger{color:var(--danger)}.scene-composer .dirty{color:var(--warn)}.scene-composer .readonly{border:1px solid var(--line);padding:8px;border-radius:4px;margin-top:10px}

/* Asset browser and workbenches */
.scene-composer .asset-browser-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;padding:4px 0}.scene-composer .asset-browser-grid input,.scene-composer .asset-browser-grid select{width:100%;margin:4px 0}.scene-composer .asset-browser-grid .catalog-list{max-height:55vh}.scene-composer .asset-browser-grid canvas{background:#05080c;max-width:960px;width:100%}.scene-composer .asset-browser-grid pre{font:12px/1.5 var(--mono);overflow-wrap:anywhere;white-space:pre-wrap}.scene-composer .asset-browser-grid section{min-width:0}
.scene-composer .character-workbench>div,.scene-composer .vehicle-workbench>section>div{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.scene-composer .character-workbench label,.scene-composer .vehicle-workbench label{justify-content:start}.scene-composer .character-workbench canvas{width:min(100%,calc(48vh * 16 / 9))!important}.scene-composer .vehicle-workbench canvas{max-width:900px;width:100%}.scene-composer .workbench-screen canvas{background:#05080c}.scene-composer .workbench-screen pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 var(--mono)}

@media(max-width:1100px){.scene-composer .workspace{grid-template-columns:var(--left-w,200px) minmax(0,1fr) var(--right-w,290px)}.scene-composer .panel-handle.left{left:calc(var(--left-w,200px) - 4px)}.scene-composer .panel-handle.right{right:calc(var(--right-w,290px) - 4px)}.scene-composer label{flex-wrap:wrap}.scene-composer aside label>input:not([type=checkbox]),.scene-composer aside label>select{width:100%}.scene-composer .timeline-grid{grid-template-columns:1fr}.scene-composer .state{display:none}}

/* Phone and narrow tablet: one column, sticky preview, Layers/Properties switch */
@media(max-width:760px){
  .scene-composer .panel-handle{display:none}
  .scene-composer{height:auto;min-height:100%;font-size:14px}
  .scene-composer button,.scene-composer input,.scene-composer select,.scene-composer .menu>summary{min-height:40px}
  .scene-composer input:not([type=checkbox]),.scene-composer select,.scene-composer textarea{font-size:16px}
  .scene-composer input[type=checkbox]{width:20px;height:20px}
  .scene-composer>header{flex-wrap:wrap;gap:8px;padding:8px 10px}
  .scene-composer .brand,.scene-composer .state{display:none}.scene-composer .document-picker{order:2;flex:1 1 100%}
  .scene-composer .actions{order:1;flex:1 1 100%;margin:0}.scene-composer .actions .primary{flex:1}
  .scene-composer .actions>button:not(.primary){width:44px;font-size:0;padding:0}.scene-composer .actions>button:not(.primary)::before{font-size:18px;content:'↶'}.scene-composer .actions>button:not(.primary)+button:not(.primary)::before{content:'↷'}
  .scene-composer .menu>summary{font-size:0;width:44px;justify-content:center;padding:0}.scene-composer .menu>summary::after{content:'⋯';font-size:20px;margin:0;color:var(--ink)}
  .scene-composer .tools button{padding:10px 12px}
  .scene-composer .workspace{display:flex;flex-direction:column}
  .scene-composer .preview-column{display:contents}
  .scene-composer .stage-wrap{order:1;position:sticky;top:0;z-index:5;min-height:0;flex:none;border-bottom:1px solid var(--line)}
  .scene-composer .preview-stage{position:relative;inset:auto;display:block;container-type:normal;padding:0;max-height:55vh}
  .scene-composer .viewport-tools{position:static;justify-content:flex-end;border-width:1px 0 0;border-radius:0;padding:2px 6px}.scene-composer .viewport-tools button{min-height:36px;padding:2px 12px}
  .scene-composer .preview-stage>canvas{width:100%;box-shadow:none}
  .scene-composer .preview-options{order:2}.scene-composer .preview-options .quick{gap:6px 14px}
  .scene-composer .preview-options .environment[open]{max-height:45vh;overflow:auto}
  .scene-composer .environment-grid{grid-template-columns:1fr}.scene-composer .environment-grid label.wide{grid-column:auto}.scene-composer .environment-grid label>input:not([type=checkbox]),.scene-composer .environment-grid label>select,.scene-composer .environment-grid label.wide>input{flex:0 1 55%}
  .scene-composer .timeline{max-height:none;overflow:visible;order:3}
  .scene-composer .panel-switch{order:4}.scene-composer .workspace>aside{order:5}
  .scene-composer .panel-switch{display:grid;grid-template-columns:1fr 1fr;gap:0;padding:8px 10px;background:var(--panel);border-bottom:1px solid var(--line)}
  .scene-composer .panel-switch button{border-radius:0;font-family:var(--mono);font-size:12px}.scene-composer .panel-switch button:first-child{border-radius:6px 0 0 6px}.scene-composer .panel-switch button:last-child{border-radius:0 6px 6px 0;border-left:0}.scene-composer .panel-switch button[aria-pressed=true]{background:#173238;border-color:var(--accent);color:var(--accent)}
  .scene-composer .workspace>aside{border:0!important;overflow:visible;padding:8px 14px 24px}
  .scene-composer[data-panel=layers] .workspace>aside:last-of-type,.scene-composer[data-panel=properties] .workspace>aside:first-of-type{display:none}
  .scene-composer label{flex-wrap:nowrap}.scene-composer aside label>input:not([type=checkbox]),.scene-composer aside label>select{width:auto;flex:0 1 58%}
  .scene-composer .hierarchy button{min-height:40px;font-size:13px}
  .scene-composer .tool-panel{overflow:visible}.scene-composer .tool-panel>section,.scene-composer .tool-panel>div{padding:10px 12px}
  .scene-composer .workbench-screen :has(>canvas){display:flex;flex-direction:column;align-items:stretch}.scene-composer .workbench-screen :has(>canvas)>canvas{order:-1;position:sticky;top:0;z-index:2;margin-bottom:8px;box-shadow:0 6px 12px #000a}
  .scene-composer .asset-browser-grid,.scene-composer .asset-browser-grid:has(.asset-grid),.scene-composer .asset-browser-grid.with-districts,.scene-composer .asset-browser-grid.with-districts:has(.asset-grid){grid-template-columns:1fr}.scene-composer .district-bar{flex-direction:row;flex-wrap:wrap}.scene-composer .style-frames,.scene-composer .frame-body,.scene-composer .frame-compare{grid-template-columns:1fr}.scene-composer .district-bar .chip{width:auto;gap:6px}.scene-composer .asset-browser-grid .catalog-list{max-height:40vh}
  .scene-composer .add-picker{position:fixed;inset:0;z-index:50;border-radius:0}.scene-composer .play-button{margin-left:0}
  .scene-composer .timeline-grid{grid-template-columns:1fr}
}
`;
