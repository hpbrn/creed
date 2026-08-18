// Account-menu rows match the 32px sidebar and panel command rows. Inset
// matches the Creed switcher list (`p-1` on the card, `px-1.5` on the row).
export const ACCOUNT_MENU_ITEM_CLASS =
  "h-8 gap-2 rounded-sm px-1.5 py-0 text-[13px] focus:bg-[var(--creed-surface-raised)] data-[state=open]:bg-[var(--creed-surface-raised)]";

// On touch, Radix still emits onOpenChange(false) after our pointerdown
// toggle. Ignore those closes so Status and Feedback stay exclusive.
export function applyAccountSubmenuOpenChange(
  isMobile: boolean,
  next: boolean,
  onOpenChange: (open: boolean) => void,
) {
  if (isMobile && !next) return;
  onOpenChange(next);
}
