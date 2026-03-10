export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout for print pages - no navbar, footer, or chrome
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
