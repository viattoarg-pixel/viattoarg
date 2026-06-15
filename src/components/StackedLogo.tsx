/** Viatto logo — green checkmark/leaf 'V' mark */
export const StackedLogo = ({ size = 16, color }: { size?: number; color?: string }) => {
  // Use brand green by default; allow override (e.g. sidebar currentColor)
  const stroke = color ?? "hsl(var(--primary))";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.5 6.5 L11 19.5 L20.5 4.5"
        stroke={stroke}
        strokeWidth="3.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  );
};
