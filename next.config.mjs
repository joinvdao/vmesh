/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
