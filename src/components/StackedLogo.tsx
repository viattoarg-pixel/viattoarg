import { cn } from "@/lib/utils";

/**
 * Viatto typographic wordmark: serif "V" with a leaf silhouette on its
 * upper-right arm (as in the original mark), followed by "iatto".
 * `size` is roughly the cap height in px.
 */
export const StackedLogo = ({
  size = 24,
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) => {
  const fontSize = size * 1.45;
  const leaf = fontSize * 0.42;

  return (
    <span
      aria-label="viatto"
      className={cn("brand-wordmark", className)}
      style={{
        fontSize,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "baseline",
        textTransform: "none",
      }}
    >
      <span style={{ position: "relative", display: "inline-block" }}>
        V
        <svg
          viewBox="0 0 24 24"
          width={leaf}
          height={leaf}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -leaf * 0.42,
            right: -leaf * 0.3,
            overflow: "visible",
          }}
        >
          {/* leaf blade */}
          <path
            d="M21.5 2.5C13.5 2.2 6.5 6.4 5.2 13.2c-.5 2.6.2 5 1.7 6.6C9.6 15 14.6 9.3 21.5 2.5Z"
            fill="currentColor"
          />
          {/* stem */}
          <path
            d="M6.9 19.8C4.4 17.4 2.9 14.2 2.5 10.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>iatto</span>
    </span>
  );
};
