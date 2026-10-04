export const metadata = {
  title: "PERF-046 sibling prefetch fixture",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
