/**
 * The official Todoist mark as an inline local SVG (ADR 11). Tabler — ADR 10's
 * icon vocabulary — has no brand marks, and adding a second icon library for
 * one logo is worse than one committed file. Per Todoist's brand guidelines the
 * mark is never recoloured or restyled; `currentColor` is used only for the
 * monochrome-on-brand-red lockup.
 */
export function TodoistMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Todoist"
      focusable="false"
    >
      <rect width="24" height="24" rx="5" fill="#E44332" />
      <path
        d="M5.4 7.6 11.6 4a.8.8 0 0 1 .8 0l6.2 3.6c.3.2.3.6 0 .8l-1 .6-5.2-3a.8.8 0 0 0-.8 0l-5.2 3-1-.6a.45.45 0 0 1 0-.8Z"
        fill="#fff"
      />
      <path
        d="M5.4 11.6 11.6 8a.8.8 0 0 1 .8 0l6.2 3.6c.3.2.3.6 0 .8l-1 .6-5.2-3a.8.8 0 0 0-.8 0l-5.2 3-1-.6a.45.45 0 0 1 0-.8Z"
        fill="#fff"
      />
      <path
        d="M5.4 15.6 11.6 12a.8.8 0 0 1 .8 0l6.2 3.6c.3.2.3.6 0 .8l-1 .6-5.2-3a.8.8 0 0 0-.8 0l-5.2 3-1-.6a.45.45 0 0 1 0-.8Z"
        fill="#fff"
      />
    </svg>
  );
}
