/** Wordmark with a small door mark. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5 text-[1.1875rem] font-bold tracking-[-0.03em]">
      <svg viewBox="0 0 24 28" width="18" height="21" aria-hidden="true" focusable="false">
        <path d="M2 27V11a10 10 0 0 1 20 0v16Z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="16.5" cy="18" r="1.8" fill="var(--color-signal)" />
      </svg>
      <span lang="en">InboxKnock</span>
    </span>
  );
}
