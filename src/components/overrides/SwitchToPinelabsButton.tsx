import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18NNAMESPACE } from "@/lib/constants";

export type SwitchToPinelabsButtonProps = {
  matchText?: string;
  onSwitchToPinelabs: () => void;
};

export const SwitchToPinelabsButton = ({
  matchText,
  onSwitchToPinelabs,
}: SwitchToPinelabsButtonProps) => {
  const { t } = useTranslation(I18NNAMESPACE);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let insertedEl: HTMLElement | null = null;

    const findDescription = () => {
      const candidates = Array.from(
        document.querySelectorAll('[data-slot="sheet-description"]'),
      ) as HTMLElement[];
      if (!candidates.length) return undefined;
      if (!matchText) return candidates[0];
      return (
        candidates.find((el) => el.textContent?.includes(matchText)) ??
        candidates[0]
      );
    };

    const tryInsert = () => {
      if (cancelled) return true;
      const description = findDescription();
      if (!description?.parentElement) return false;

      const existing = description.parentElement.querySelector(
        '[data-pinelabs-switch-slot="true"]',
      );
      if (existing) {
        setContainer(existing as HTMLElement);
        return true;
      }

      const el = document.createElement("div");
      el.setAttribute("data-pinelabs-switch-slot", "true");
      description.parentElement.insertBefore(el, description.nextSibling);
      insertedEl = el;
      setContainer(el);
      return true;
    };

    if (!tryInsert()) {
      observer = new MutationObserver(() => {
        if (tryInsert()) {
          observer?.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      insertedEl?.remove();
    };
  }, [matchText]);

  if (!container) return null;

  return createPortal(
    <button
      type="button"
      onClick={onSwitchToPinelabs}
      className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
    >
      <ArrowUpLeft className="h-4 w-4" />
      {t("switch_to_pinelabs_terminal")}
    </button>,
    container,
  );
};
