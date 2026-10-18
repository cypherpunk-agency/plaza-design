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
.scene-composer .workspace{flex:1;min-height:0;display:grid;grid-template-columns:250px minmax(0,1fr) 290px;grid-template-areas:'left center right'}
.scene-composer .preview-column{grid-area:center;min-width:0;min-height:0;display:flex;flex-direction:column}
.scene-composer .workspace>aside{padding:10px 12px;overflow:auto;background:var(--panel);min-height:0}.scene-composer .workspace>aside:first-of-type{grid-area:left;border-right:1px solid var(--line)}.scene-composer .workspace>aside:last-of-type{grid-area:right;border-left:1px solid var(--line)}
.scene-composer .panel-switch{display:none}
.scene-composer .workspace>aside>details:first-child{border-top:0;margin-top:0;padding-top:0}.scene-composer label:has(>input[type=checkbox]){flex-wrap:nowrap}
.scene-composer .preview-options{border-bottom:1px solid var(--line);background:var(--panel)}
.scene-composer .preview-options .quick{display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap;padding:6px 10px}.scene-composer .preview-options .quick label{margin:0;justify-content:start}.scene-composer .preview-options .quick input[type=number]{width:72px}
.scene-composer .frame-step{display:flex;gap:4px}
.scene-composer .preview-options .environment{margin:0;padding:0 10px 6px;border-top:1px solid var(--line)}.scene-composer .preview-options .environment>summary{padding:6px 0 0}
.scene-composer .environment-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 16px;padding-top:6px}.scene-composer .environment-grid label{margin:2px 0}.scene-composer .environment-grid label.wide{grid-column:span 2}.scene-composer .environment-grid label>input:not([type=checkbox]),.scene-composer .environment-grid label>select{width:auto;flex:0 1 120px}.scene-composer .environment-grid label.wide>input{flex-basis:220px}
.scene-composer .stage-wrap{position:relative;flex:1;min-height:200px}
.scene-composer .preview-stage{position:absolute;inset:0;overflow:auto;display:grid;align-items:safe center;justify-items:safe center;background:#05080c;container-type:size;padding:8px;overscroll-behavior:contain}
.scene-composer .preview-stage>canvas[data-hover=artwork]{cursor:pointer}.scene-composer .preview-stage>canvas[data-hover=selected]{cursor:move}.scene-composer .preview-stage>canvas[data-hover=empty]{cursor:grab}.scene-composer .preview-stage>canvas[data-panning]{cursor:grabbing}
.scene-composer .hover-box{position:absolute;pointer-events:none;outline:1px solid #ffd27acc;outline-offset:1px}.scene-composer .hover-box[hidden]{display:none}
.scene-composer .hover-box::after{content:attr(data-label);position:absolute;left:-2px;bottom:calc(100% + 3px);font:11px/1.4 var(--mono);background:#10151df0;color:var(--warn);padding:1px 6px;border-radius:3px;white-space:nowrap}
.scene-composer .viewport-tools{position:absolute;right:12px;bottom:12px;z-index:3;display:flex;gap:2px;padding:3px;background:#10151de6;border:1px solid var(--line);border-radius:6px}.scene-composer .viewport-tools[hidden]{display:none}
.scene-composer .viewport-tools button{min-height:26px;padding:2px 9px;border-color:transparent;background:none;font-family:var(--mono);font-size:12px}.scene-composer .viewport-tools .zoom-level{min-width:56px}.scene-composer .viewport-tools button[aria-pressed=true]{color:var(--accent);border-color:var(--line-strong)}
.scene-composer canvas{display:block;max-width:100%;image-rendering:pixelated;touch-action:none}
.scene-composer .preview-stage>canvas{width:min(100cqw - 16px,(100cqh - 16px) * var(--fit-ratio,var(--ratio,1.7778)));height:auto;box-shadow:0 0 0 1px var(--line)}
.scene-composer .preview-error{position:absolute;inset:20px auto auto 20px;max-width:85%;padding:10px;background:#3a1f2c;color:#ffc0c0;white-space:pre-wrap}.scene-composer .preview-error[hidden]{display:none}
.scene-composer .timeline{border-top:1px solid var(--line);padding:9px 12px;max-height:40%;overflow:auto;background:var(--panel)}.scene-composer .timeline:empty{display:none}.scene-composer .timeline input[type=range]{flex:1;min-width:100px}.scene-composer .timeline .time{font-variant-numeric:tabular-nums;white-space:nowrap}.scene-composer .timeline-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Forms and lists */
.scene-composer .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.scene-composer .row>*{flex:1}.scene-composer .row>button{flex:0 1 auto}
.scene-composer label{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:5px 0}.scene-composer label>span{color:var(--muted)}.scene-composer label>input:not([type=checkbox]),.scene-composer label>select{width:130px}.scene-composer label>input[type=checkbox]{margin-right:auto}
.scene-composer textarea{display:block;width:100%;min-height:95px;resize:vertical;font:12px/1.5 var(--mono);tab-size:2}
.scene-composer .hierarchy{list-style:none;margin:0 -6px;padding:0}.scene-composer .hierarchy button{display:block;width:100%;text-align:left;margin:0;border:0;border-left:2px solid transparent;border-radius:0;background:none;min-height:28px;padding:4px 10px;font:12px/1.4 var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-composer .hierarchy button:hover{background:var(--raised)}.scene-composer .hierarchy button[aria-pressed=true]{border-left-color:var(--accent);background:#173238;color:var(--accent)}
.scene-composer .layers>.hierarchy{margin-top:6px}.scene-composer .catalog-list{max-height:320px;overflow:auto}.scene-composer .catalog-group{border:0;margin:0;padding:2px 0}.scene-composer .catalog-group>button{display:block;width:100%;text-align:left;margin:1px 0;border-color:transparent;background:none;font-size:12px}.scene-composer .catalog-group>button:hover{background:var(--raised)}
.scene-composer .layer-tools{display:flex;gap:6px;align-items:center;margin:6px 0}.scene-composer .layer-tools input[type=search]{flex:1;width:auto}
.scene-composer .segmented{display:flex}.scene-composer .segmented button{border-radius:0;padding:4px 8px;font-size:11px;font-family:var(--mono)}.scene-composer .segmented button:first-child{border-radius:4px 0 0 4px}.scene-composer .segmented button:last-child{border-radius:0 4px 4px 0;border-left:0}.scene-composer .segmented button[aria-pressed=true]{color:var(--accent);border-color:var(--accent)}
.scene-composer .layer-group{margin-top:4px;padding-top:4px}.scene-composer .layer-group>summary{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}.scene-composer .layer-group>summary:hover{color:var(--ink)}
.scene-composer .hierarchy button{display:flex!important;align-items:baseline;justify-content:space-between;gap:8px}.scene-composer .layer-name{overflow:hidden;text-overflow:ellipsis}.scene-composer .layer-kind{flex:0 1 auto;max-width:55%;overflow:hidden;text-overflow:ellipsis;color:var(--muted);font:11px/1.4 system-ui,sans-serif;opacity:.8}.scene-composer .catalog-list>button{display:block;width:100%;text-align:left;margin:2px 0;border-color:transparent;background:none}.scene-composer .catalog-list>button:hover{background:var(--raised)}
.scene-composer .binding-row{display:flex;justify-content:space-between;gap:8px;margin:4px 0}.scene-composer .binding-row code{font:11px/1.4 var(--mono);color:var(--ink);overflow-wrap:anywhere;text-align:right}
.scene-composer .tool-panel label{justify-content:flex-start;gap:12px}.scene-composer .tool-panel label>input:not([type=checkbox]),.scene-composer .tool-panel label>select{width:auto;min-width:140px}
.scene-composer .debug-drawer{margin-top:14px}.scene-composer .debug-drawer>summary{color:var(--muted)}.scene-composer .debug-drawer pre{font:11px/1.45 var(--mono);background:var(--field);border:1px solid var(--line);border-radius:4px;padding:8px}
.scene-composer .danger{color:var(--danger)}.scene-composer .dirty{color:var(--warn)}.scene-composer .readonly{border:1px solid var(--line);padding:8px;border-radius:4px;margin-top:10px}

/* Asset browser and workbenches */
.scene-composer .asset-browser-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;padding:4px 0}.scene-composer .asset-browser-grid input,.scene-composer .asset-browser-grid select{width:100%;margin:4px 0}.scene-composer .asset-browser-grid .catalog-list{max-height:55vh}.scene-composer .asset-browser-grid canvas{background:#05080c;max-width:960px;width:100%}.scene-composer .asset-browser-grid pre{font:12px/1.5 var(--mono);overflow-wrap:anywhere;white-space:pre-wrap}.scene-composer .asset-browser-grid section{min-width:0}
.scene-composer .character-workbench>div,.scene-composer .vehicle-workbench>section>div{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.scene-composer .character-workbench label,.scene-composer .vehicle-workbench label{justify-content:start}.scene-composer .character-workbench canvas{width:min(100%,calc(48vh * 16 / 9))!important}.scene-composer .vehicle-workbench canvas{max-width:900px;width:100%}.scene-composer .workbench-screen canvas{background:#05080c}.scene-composer .workbench-screen pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 var(--mono)}

@media(max-width:1100px){.scene-composer .workspace{grid-template-columns:210px minmax(0,1fr) 250px}.scene-composer label{flex-wrap:wrap}.scene-composer aside label>input:not([type=checkbox]),.scene-composer aside label>select{width:100%}.scene-composer .timeline-grid{grid-template-columns:1fr}.scene-composer .state{display:none}}

/* Phone and narrow tablet: one column, sticky preview, Layers/Properties switch */
@media(max-width:760px){
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
  .scene-composer .asset-browser-grid{grid-template-columns:1fr}.scene-composer .asset-browser-grid .catalog-list{max-height:40vh}
  .scene-composer .timeline-grid{grid-template-columns:1fr}
}
`;
