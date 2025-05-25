"use client";
import Image from "next/image";

export default function SchoolBanner({
  schoolName,
  schoolLogo,
  primaryColor,
  secondaryColor,
}) {
  // Fallback to default colors if custom colors are not provided or are invalid
  const bannerBgColor = primaryColor || "#D1D5DB"; // Default to gray-300
  const bannerBorderColor = secondaryColor || "#6B7280"; // Default to gray-500

  // Basic contrast checker (simplified)
  function getLuminance(hexColor) {
    if (!hexColor || hexColor.length < 4) return 0; // Handle invalid or short hex codes
    const hex = hexColor.startsWith("#") ? hexColor.slice(1) : hexColor;
    if (hex.length === 3) {
      // Expand shorthand hex
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const lum = [r, g, b].map((c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    }
    if (hex.length !== 6) return 0; // Handle invalid length hex codes
    const rgb = parseInt(hex, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    const lum = [r, g, b].map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
  }

  function getContrastRatio(hexColor1, hexColor2 = "#FFFFFF") {
    const lum1 = getLuminance(hexColor1);
    const lum2 = getLuminance(hexColor2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return isNaN(ratio) ? 1 : ratio; // Return 1 if ratio is NaN (e.g. invalid color)
  }

  const textColor =
    getContrastRatio(bannerBgColor) > 4.5 ? "#FFFFFF" : "#000000"; // WCAG AA standard for normal text

  const textStyle = {
    color: textColor,
  };

  return (
    <div
      className="rounded-md p-3 border-2 shadow-md"
      style={{ backgroundColor: bannerBgColor, borderColor: bannerBorderColor }}
    >
      <div className="bg-white rounded p-2 flex justify-center items-center min-h-[60px]">
        {schoolLogo ? (
          <Image
            src={schoolLogo}
            alt={`${schoolName} Logo`}
            width={50}
            height={50}
            className="object-contain"
          />
        ) : (
          <span className="text-gray-500 text-sm">No Logo</span>
        )}
      </div>
      <div className="mt-2 text-center">
        <p className="font-semibold break-words" style={textStyle}>
          {schoolName}
        </p>
      </div>
    </div>
  );
}

SchoolBanner.defaultProps = {
  schoolName: "Your School",
  schoolLogo: "",
  primaryColor: "#BF5700", // Texas Orange as a default example primary
  secondaryColor: "#333F48", // Texas Dark Gray as a default example secondary
};
