/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@deck.gl/core",
    "@deck.gl/layers",
    "@deck.gl/geo-layers",
    "@deck.gl/mapbox",
    "deck.gl",
    "maplibre-gl",
    "h3-js"
  ]
};

export default nextConfig;
