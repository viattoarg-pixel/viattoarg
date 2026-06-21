import logoAsset from "@/assets/viatto-logo-official.png.asset.json";

/** Viatto official logo (image). `size` controls height; width auto-scales. */
export const StackedLogo = ({ size = 24 }: { size?: number; color?: string }) => {
  return (
    <img
      src={logoAsset.url}
      alt="Viatto"
      height={size}
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
};
