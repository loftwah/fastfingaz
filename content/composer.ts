import { COMPOSER_SELECTORS, SEND_SELECTORS } from '../shared/constants';

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 8) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

function isEditable(el: HTMLElement): boolean {
  return (
    el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && el.type === 'text')
  );
}

/**
 * Prefer ChatGPT's composer identifiers. The fallback needs a matching send
 * control in its form so other editors on ChatGPT aren't measured.
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

  for (const el of document.querySelectorAll<HTMLElement>(
    'main form .ProseMirror[contenteditable="true"], main form textarea[placeholder*="Message"]',
  )) {
    if (el.closest('form')?.querySelector(SEND_SELECTORS.join(',')) && isVisible(el)) return el;
  }
  return null;
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
  return SEND_SELECTORS.some((selector) => {
    const button = target.closest<HTMLButtonElement>(selector);
    return !!button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
  });
}
