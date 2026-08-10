import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-card": "var(--gradient-card)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["Outfit", "system-ui", "sans-serif"],
        serif: ["Outfit", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // App-wide placeholder typography rule.
    //
    // Use the `placeholder-default` utility on any input/textarea/select-trigger
    // to inherit the project standard:
    //   - mobile:           15px / weight 400
    //   - tablet & desktop: 16px / weight 400
    //
    // Centralized here so future components automatically match without
    // duplicating placeholder:* utilities at the call site.
    plugin(({ addUtilities, theme }) => {
      addUtilities({
        ".placeholder-default": {
          "&::placeholder": {
            fontSize: "15px",
            fontWeight: "400",
            lineHeight: "22px",
          },
          [`@media (min-width: ${theme("screens.md")})`]: {
            "&::placeholder": {
              fontSize: "16px",
              fontWeight: "400",
              lineHeight: "24px",
            },
          },
          // Radix Select shows the placeholder text inside the trigger itself,
          // marked with `data-placeholder`. Mirror the same rules there.
          "&[data-placeholder]": {
            fontSize: "15px",
            fontWeight: "400",
            lineHeight: "22px",
          },
          [`@media (min-width: ${theme("screens.md")})`]: {
            "&[data-placeholder]": {
              fontSize: "16px",
              fontWeight: "400",
              lineHeight: "24px",
            },
          },
        },
      });
    }),

    // App-wide typography utilities (component layer).
    //
    // Each `.typo-*` class reads from CSS variables so the design system
    // can be edited live from the Style Guide (see
    // `src/lib/designTokens.ts` + `DesignTokensProvider`). The fallback
    // values baked here are the integer-pixel defaults — keep them in
    // lock-step with `TYPOGRAPHY_DEFAULTS`.
    plugin(({ addComponents, theme }) => {
      const sm = `@media (min-width: ${theme("screens.sm")})`;
      const lg = `@media (min-width: ${theme("screens.lg")})`;

      // Shape: [variant, color, mobile{size,lh,weight,tracking}, tablet, desktop]
      // tracking is a string (e.g. "-0.025em" or "0").
      type Spec = [number, number, number, string];
      const variants: Array<{
        name: string;
        color: string;
        mobile: Spec;
        tablet: Spec;
        desktop: Spec;
      }> = [
        { name: "h1", color: "hsl(var(--foreground))",
          mobile: [30, 36, 600, "-0.025em"], tablet: [34, 40, 600, "-0.025em"], desktop: [40, 48, 600, "-0.025em"] },
        { name: "h2", color: "hsl(var(--foreground))",
          mobile: [24, 32, 600, "-0.025em"], tablet: [28, 34, 600, "-0.025em"], desktop: [32, 40, 600, "-0.025em"] },
        { name: "h3", color: "hsl(var(--foreground))",
          mobile: [20, 28, 600, "-0.025em"], tablet: [22, 30, 600, "-0.025em"], desktop: [26, 34, 600, "-0.025em"] },
        { name: "h4", color: "hsl(var(--foreground))",
          mobile: [18, 26, 600, "0"], tablet: [19, 26, 600, "0"], desktop: [22, 30, 600, "0"] },
        { name: "body-strong", color: "hsl(var(--foreground))",
          mobile: [14, 20, 500, "0"], tablet: [15, 22, 500, "0"], desktop: [16, 24, 500, "0"] },
        { name: "body", color: "hsl(var(--foreground))",
          mobile: [14, 20, 400, "0"], tablet: [15, 22, 400, "0"], desktop: [16, 24, 400, "0"] },
        { name: "body-muted", color: "hsl(var(--muted-foreground))",
          mobile: [14, 20, 400, "0"], tablet: [15, 22, 400, "0"], desktop: [16, 24, 400, "0"] },
        { name: "small", color: "hsl(var(--foreground))",
          mobile: [13, 18, 400, "0"], tablet: [13, 18, 400, "0"], desktop: [14, 20, 400, "0"] },
        { name: "muted", color: "hsl(var(--muted-foreground))",
          mobile: [13, 18, 400, "0"], tablet: [13, 18, 400, "0"], desktop: [14, 20, 400, "0"] },
      ];

      const components: Record<string, Record<string, unknown>> = {};
      const baseFamily = "'Outfit', system-ui, sans-serif";
      const monoFamily = "'Outfit', system-ui, sans-serif";

      for (const v of variants) {
        const sel = `.typo-${v.name}`;
        components[sel] = {
          fontFamily: baseFamily,
          color: v.color,
          fontSize: `var(--ty-${v.name}-size, ${v.mobile[0]}px)`,
          lineHeight: `var(--ty-${v.name}-lh, ${v.mobile[1]}px)`,
          fontWeight: `var(--ty-${v.name}-weight, ${v.mobile[2]})`,
          letterSpacing: `var(--ty-${v.name}-tracking, ${v.mobile[3]})`,
          [sm]: {
            fontSize: `var(--ty-${v.name}-size-sm, ${v.tablet[0]}px)`,
            lineHeight: `var(--ty-${v.name}-lh-sm, ${v.tablet[1]}px)`,
            fontWeight: `var(--ty-${v.name}-weight-sm, ${v.tablet[2]})`,
            letterSpacing: `var(--ty-${v.name}-tracking-sm, ${v.tablet[3]})`,
          },
          [lg]: {
            fontSize: `var(--ty-${v.name}-size-lg, ${v.desktop[0]}px)`,
            lineHeight: `var(--ty-${v.name}-lh-lg, ${v.desktop[1]}px)`,
            fontWeight: `var(--ty-${v.name}-weight-lg, ${v.desktop[2]})`,
            letterSpacing: `var(--ty-${v.name}-tracking-lg, ${v.desktop[3]})`,
          },
        };
      }

      // Mono + Code (separate since they use the mono family).
      const monoVariants = [
        { name: "mono", color: "hsl(var(--foreground))",
          mobile: [14, 20, 400], tablet: [15, 22, 400], desktop: [16, 24, 400] },
        { name: "code", color: "hsl(var(--foreground))",
          mobile: [12, 16, 400], tablet: [13, 18, 400], desktop: [14, 20, 400] },
      ];
      for (const v of monoVariants) {
        components[`.typo-${v.name}`] = {
          fontFamily: monoFamily,
          color: v.color,
          fontSize: `var(--ty-${v.name}-size, ${v.mobile[0]}px)`,
          lineHeight: `var(--ty-${v.name}-lh, ${v.mobile[1]}px)`,
          fontWeight: `var(--ty-${v.name}-weight, ${v.mobile[2]})`,
          letterSpacing: `var(--ty-${v.name}-tracking, 0)`,
          [sm]: {
            fontSize: `var(--ty-${v.name}-size-sm, ${v.tablet[0]}px)`,
            lineHeight: `var(--ty-${v.name}-lh-sm, ${v.tablet[1]}px)`,
            fontWeight: `var(--ty-${v.name}-weight-sm, ${v.tablet[2]})`,
          },
          [lg]: {
            fontSize: `var(--ty-${v.name}-size-lg, ${v.desktop[0]}px)`,
            lineHeight: `var(--ty-${v.name}-lh-lg, ${v.desktop[1]}px)`,
            fontWeight: `var(--ty-${v.name}-weight-lg, ${v.desktop[2]})`,
          },
        };
      }
      // `.typo-code` keeps its chip look.
      (components[".typo-code"] as Record<string, unknown>).borderRadius = "0.25rem";
      (components[".typo-code"] as Record<string, unknown>).backgroundColor = "hsl(var(--muted))";
      (components[".typo-code"] as Record<string, unknown>).paddingLeft = "0.25rem";
      (components[".typo-code"] as Record<string, unknown>).paddingRight = "0.25rem";

      addComponents(components);
    }),
  ],
} satisfies Config;
