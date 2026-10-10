import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

let locks = 0;
let restorePage = () => {};
const focusable =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex="0"]';

export default function ModalFrame({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const previousFocus = opener.current;
    if (locks++ === 0) {
      const top = window.scrollY;
      const left = window.scrollX;
      const original = document.body.style.cssText;
      const app = document.querySelector<HTMLElement>(".app");
      const wasInert = app?.inert ?? false;
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.position = "fixed";
      document.body.style.top = `-${top}px`;
      document.body.style.left = `-${left}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${gap}px`;
      if (app) app.inert = true;
      restorePage = () => {
        document.body.style.cssText = original;
        if (app) app.inert = wasInert;
        window.scrollTo(left, top);
      };
    }
    const elements = () =>
      [
        ...(frame.current?.querySelectorAll<HTMLElement>(focusable) ?? []),
      ].filter((el) => el.getClientRects().length > 0);
    const initial = frame.current?.contains(document.activeElement)
      ? (document.activeElement as HTMLElement)
      : elements()[0];
    initial?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key === "Tab") {
        const items = elements();
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (--locks === 0) restorePage();
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  const dark = document.querySelector(".app")?.classList.contains("dark");
  return createPortal(
    <div ref={frame} className={`app modal-backdrop${dark ? " dark" : ""}`}>
      {children}
    </div>,
    document.body,
  );
}
