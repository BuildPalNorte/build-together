/** Two filled discs joined by a thread. currentColor, 32x32 viewBox, no glow. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <line
        x1="9.2"
        y1="16"
        x2="22.8"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="16" r="3.4" />
      <circle cx="22.8" cy="16" r="3.4" />
    </svg>
  );
}
