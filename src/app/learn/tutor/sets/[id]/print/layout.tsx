export default function PrintLayout({ children }: { children: React.ReactNode }) {
  // Minimal, chrome-less document for clean printing (matches the tournament
  // print pages). No navbar/footer; light theme for paper.
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#fff' }}>{children}</body>
    </html>
  );
}
