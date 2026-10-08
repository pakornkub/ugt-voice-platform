import type React from 'react';

/**
 * Props that make a non-button element (a clickable card/row) keyboard-operable:
 * role="button", focusable, and Enter/Space trigger the same handler as a click.
 * Key events bubbling up from nested controls (e.g. an inner button) are ignored.
 */
export const clickableProps = (onActivate: () => void) => ({
  role: 'button' as const,
  tabIndex: 0,
  onClick: onActivate,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  },
});
