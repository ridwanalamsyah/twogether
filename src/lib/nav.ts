import { ITEMS, isActive } from "@/components/shell/BottomNav";

/** In-app page history for this session, newest last. Maintained by app/(app)/template.tsx. */
export const pageStack: string[] = [];

export const TAB_ROOTS = ITEMS.map((i) => i.href);

export function isTabRoot(path: string): boolean {
  return TAB_ROOTS.includes(path);
}

/**
 * Back from a page: the previous page if we came from one in this session,
 * otherwise the tab the page belongs to (e.g. opened from a notification or
 * after a reload) — never off into nothing.
 */
export function goBack(router: { back(): void; push(href: string): void }) {
  if (pageStack.length >= 2) {
    router.back();
    return;
  }
  const here = window.location.pathname;
  const tab = ITEMS.find((i) => isActive(here, i)) ?? ITEMS[0];
  router.push(tab.href === here ? ITEMS[0].href : tab.href);
}
