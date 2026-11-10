import { COMPOSER_SELECTORS, SEND_SELECTORS } from '../shared/constants';

export function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 8) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

export function isEditable(el: HTMLElement): boolean {
  return (
    el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && el.type === 'text')
  );
}

/**
 * Find the ChatGPT composer. Most specific selectors win; the last resort is
 * geometric, because ChatGPT's class names are hashed and change often.
 */
export function findComposer(): HTMLElement | null {
  for (const selector of COMPOSER_SELECTORS) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    for (const node of nodes) {
      const target = isEditable(node)
        ? node
        : node.querySelector<HTMLElement>('[contenteditable="true"], textarea');
      if (target && isEditable(target) && isVisible(target)) return target;
    }
  }

  const viewportMid = window.innerHeight * 0.55;
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('[contenteditable="true"], textarea'),
  )
    .filter((el) => isEditable(el) && isVisible(el))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 220 && rect.bottom > viewportMid;
    })
    .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);

  return candidates[0] ?? null;
}

/** ProseMirror's empty state is a single newline. Normalise it to "". */
export function getComposerText(el: HTMLElement): string {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el.value;
  const raw = el.innerText ?? el.textContent ?? '';
  if (!raw.trim()) return '';
  return raw.replace(/\u00a0/g, ' ').replace(/\n+$/, '');
}

export function selectionLength(el: HTMLElement): number {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    return Math.abs(end - start) || 1;
  }
  return window.getSelection()?.toString().length || 1;
}

export function isSendControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return SEND_SELECTORS.some((selector) => !!target.closest(selector));
}
