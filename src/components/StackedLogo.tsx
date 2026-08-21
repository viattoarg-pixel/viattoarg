import logoAsset from "@/assets/viatto-logo-official.png";

/** Viatto official logo (image). `size` controls height; width auto-scales. */
export const StackedLogo = ({ size = 24 }: { size?: number; color?: string }) => {
  return (
    <img
      src={logoAsset}
      alt="Viatto"
      height={size}
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
};
