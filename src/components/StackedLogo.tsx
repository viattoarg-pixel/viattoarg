/** Viatto logo — bold green 'V' mark with leaf accent */
export const StackedLogo = ({ size = 24, color }: { size?: number; color?: string }) => {
  const fill = color ?? "hsl(var(--primary))";
  const accent = color ?? "hsl(var(--accent))";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Solid bold V shape */}
      <path
        d="M4 6 L16 28 L28 6"
        stroke={fill}
        strokeWidth="5.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
      {/* Inner accent line for definition */}
      <path
        d="M7 8 L16 24 L25 8"
        stroke={accent}
        strokeWidth="1.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
};
