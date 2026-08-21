import { cn } from "@/lib/utils";

/**
 * Viatto typographic wordmark. `size` is the cap height in px (font-size).
 * Elegant serif, lowercase, dark green.
 */
export const StackedLogo = ({
  size = 24,
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) => (
  <span
    aria-label="viatto"
    className={cn("brand-wordmark", className)}
    style={{ fontSize: size * 1.45, lineHeight: 1 }}
  >
    viatto
  </span>
);
