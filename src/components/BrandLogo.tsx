import { cn } from "@/lib/utils";
import logoAsset from "@/assets/pharmasee-logo.png.asset.json";

type BrandLogoProps = {
  className?: string;
};

/**
 * PharmaSee brand mark — rendered as a raster logo image.
 * Sizes come from the passed className (e.g. `h-6 w-6`).
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="PharmaSee"
      className={cn("h-5 w-5 object-contain", className)}
      draggable={false}
    />
  );
}

export default BrandLogo;
