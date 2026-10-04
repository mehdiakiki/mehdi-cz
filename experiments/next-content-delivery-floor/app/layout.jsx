import { baseFontPreload } from "../generated/resources";
import { preload } from "react-dom";

export default function RootLayout({ children }) {
  preload(baseFontPreload.href, {
    as: "font",
    crossOrigin: "",
    type: baseFontPreload.type,
  });
  return (
    <html lang="en-us" className="__variable_b323cf scroll-smooth">
      <body className="bg-white pl-[calc(100vw-100%)] text-black antialiased dark:bg-gray-950 dark:text-white">
        {children}
      </body>
    </html>
  );
}
