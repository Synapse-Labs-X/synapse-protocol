const nextConfig = {
  reactStrictMode: true,
  // Transpile specific modules that might be causing issues
  transpilePackages: ["react-force-graph-2d", "react-force-graph", "d3-force", "d3"],
  // Configure webpack to handle node polyfills
}

module.exports = nextConfig