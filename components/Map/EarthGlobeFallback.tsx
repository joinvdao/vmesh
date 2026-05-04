"use client";

const earthTextureUrl =
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74393/world.topo.bathy.200412.3x5400x2700.jpg";

export function EarthGlobeFallback() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <div
        className="vmesh-earth-rotate absolute -left-[34%] top-0 h-full w-[168%] scale-110 bg-cover bg-center opacity-80 saturate-[1.16] contrast-[1.08]"
        style={{ backgroundImage: `url(${earthTextureUrl})` }}
      />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_31%_24%,rgba(255,255,255,0.68),transparent_28%),radial-gradient(circle_at_68%_64%,rgba(0,78,94,0.22),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.2),rgba(11,67,86,0.18))]" />
      <div className="absolute inset-0 rounded-full shadow-[inset_34px_26px_64px_rgba(255,255,255,0.5),inset_-72px_-48px_94px_rgba(8,45,59,0.42)]" />
      <div className="absolute inset-[5%] rounded-full border border-white/40" />
    </div>
  );
}
