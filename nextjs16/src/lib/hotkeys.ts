export function shouldIgnoreKey(e: KeyboardEvent): boolean {
  const target = e.target as Element | null;

  const isEditable =
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]'
      ) || (target as HTMLElement).isContentEditable
    );

  return (
    isEditable ||
    e.metaKey ||
    e.ctrlKey ||
    e.altKey ||
    e.isComposing ||
    e.repeat
  );
}
