import "./globals.css";

export const metadata = {
  title: "Next rendering boundary reproduction",
  description: "Controlled comparison of four rendering and delivery contracts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
