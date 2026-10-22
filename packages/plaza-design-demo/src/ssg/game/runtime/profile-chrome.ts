import { playProfile } from './play-profile';

/** The page-level look of the active play profile: its page class, and no status badges when the HUD is minimal. */
export function applyProfileChrome(html: HTMLElement) {
  const { chrome } = playProfile();
  if (chrome.pageClass) html.classList.add(chrome.pageClass);
  if (chrome.minimalHud) {
    const style = document.createElement('style');
    style.textContent = '.game-mode .header-online,.game-mode .plaza-window-header>span:last-child,.game-mode .footer-timestamp{display:none}';
    document.head.append(style);
  }
}
