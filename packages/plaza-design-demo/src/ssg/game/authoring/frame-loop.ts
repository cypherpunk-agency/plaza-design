/** Runs one animation frame's work so a failure never stops the loop that called it. The error is re-raised
 * outside the frame (once per distinct message) so the editor's status-bar error chip shows it. */
const reported = new Set<string>();
export function runFrame(work: () => void) {
  try { work(); }
  catch (error) { const text = error instanceof Error ? error.message : String(error); if (!reported.has(text)) { reported.add(text); setTimeout(() => { throw error; }); } }
}
