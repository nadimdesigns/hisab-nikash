import { useEffect } from "react";
import { buildOverrideCss, useDesignTokens } from "@/lib/designTokens";

/**
 * Injects a single `<style id="design-tokens-overrides">` block whose
 * contents are derived from the persisted token store. Any change in the
 * Style Guide editor updates these CSS variables, which the `typo-*`
 * classes (and shadcn tokens) consume immediately.
 */
const DesignTokensProvider = ({ children }: { children: React.ReactNode }) => {
  const typography = useDesignTokens((s) => s.typography);
  const colorsLight = useDesignTokens((s) => s.colorsLight);
  const colorsDark = useDesignTokens((s) => s.colorsDark);

  useEffect(() => {
    const id = "design-tokens-overrides";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = buildOverrideCss({ typography, colorsLight, colorsDark });
  }, [typography, colorsLight, colorsDark]);

  return <>{children}</>;
};

export default DesignTokensProvider;
