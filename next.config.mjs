/** @type {import('next').NextConfig} */
const configuredBasePath = process.env.BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH || "";
const normalizedBasePath = configuredBasePath.replace(/^\/+|\/+$/g, "");
const basePath = normalizedBasePath ? `/${normalizedBasePath}` : "";

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
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
