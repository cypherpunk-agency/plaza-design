/** Runtime constants shared by input, camera and presentation. */
export const TAPPED = 18, TAP_REACH = 60;
export const NET_OPENED = 'net:opened';
export const NUDGE_HOLD = 96, NUDGE_EASE = 0.045, NUDGE_MARGIN = 36, NUDGE_GAP = 300;
export const VISION_ZOOM_MIN = 0.7;
export const MIN_VIEW_W = 460;
export const MAX_VIEW_H = 440;
export const CLOCK_SAVE = 600;
export const hmOf = (min: number) => { const m = ((Math.floor(min) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
