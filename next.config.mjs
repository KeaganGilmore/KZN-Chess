/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server with only the traced dependencies. Railway bills
  // page cache as memory, so not loading the full node_modules tree matters.
  output: 'standalone',
  webpack(config) {
    // Legal documents (src/content/legal/*.md) are imported as plain strings
    // and bundled at build time, so the standalone server never reads them
    // from disk.
    config.module.rules.push({ test: /\.md$/, type: 'asset/source' });
    return config;
  },
};

export default nextConfig;
