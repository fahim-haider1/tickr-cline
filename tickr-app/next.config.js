/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next treats this app folder as the workspace root
  // to avoid chunk path/resolution issues in monorepo-like layouts
  outputFileTracingRoot: __dirname,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
}

module.exports = nextConfig
