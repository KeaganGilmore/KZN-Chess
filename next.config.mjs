/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server with only the traced dependencies. Railway bills
  // page cache as memory, so not loading the full node_modules tree matters.
  output: 'standalone',
};

export default nextConfig;
