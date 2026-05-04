"use client";

const earthTextureUrl =
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74393/world.topo.bathy.200412.3x5400x2700.jpg";

export function EarthGlobeFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <div
        className="vmesh-earth-rotate absolute inset-y-0 -left-[24%] w-[148%] bg-cover bg-center opacity-95 brightness-[0.96] saturate-[1.22] contrast-[1.1]"
        style={{ backgroundImage: `url(${earthTextureUrl})` }}
      />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_31%_23%,rgba(236,248,255,0.5),transparent_26%),radial-gradient(circle_at_70%_64%,rgba(0,19,32,0.36),transparent_42%),linear-gradient(128deg,rgba(255,255,255,0.06),rgba(0,7,16,0.34))]" />
      <div className="absolute inset-0 rounded-full shadow-[inset_38px_28px_76px_rgba(231,248,255,0.24),inset_-82px_-54px_108px_rgba(0,7,15,0.52)]" />
      <div className="absolute inset-[4.5%] rounded-full border border-[#d8eeff]/35" />
    </div>
  );
}
