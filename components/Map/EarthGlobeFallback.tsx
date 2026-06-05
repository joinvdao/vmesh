function WorldAtlasTexture() {
  return (
    <svg
      className="vmesh-earth-atlas-drift absolute inset-y-[-8%] -left-[58%] h-[116%] w-[216%]"
      viewBox="0 0 2400 900"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vmesh-land" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#d7dfb9" />
          <stop offset="38%" stopColor="#6fa263" />
          <stop offset="72%" stopColor="#4f8f68" />
          <stop offset="100%" stopColor="#d0ad6d" />
        </linearGradient>
        <linearGradient id="vmesh-ridge" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#f1f4e9" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#9a8159" stopOpacity="0.52" />
        </linearGradient>
        <filter id="vmesh-land-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#052c2e" floodOpacity="0.32" />
        </filter>
        <symbol id="vmesh-world-panel" viewBox="0 0 1200 900">
          <g filter="url(#vmesh-land-shadow)">
            <path
              fill="url(#vmesh-land)"
              d="M84 248C123 183 192 151 255 166C320 181 334 224 386 238C448 255 503 218 560 244C613 268 623 321 684 337C734 351 763 326 806 352C862 385 875 457 836 510C796 566 723 548 679 602C637 653 671 714 628 759C582 807 492 778 453 728C415 679 444 625 399 585C352 543 300 578 244 539C181 495 202 426 148 390C106 361 54 391 35 357C17 325 55 294 84 248Z"
            />
            <path
              fill="url(#vmesh-land)"
              d="M727 144C782 95 882 96 938 146C986 188 976 248 1035 274C1083 296 1124 273 1154 306C1188 344 1168 417 1117 451C1062 488 1004 448 950 484C897 520 916 589 866 618C813 649 732 609 704 550C675 491 728 451 704 393C677 330 615 321 623 268C631 216 683 184 727 144Z"
            />
            <path
              fill="url(#vmesh-land)"
              d="M960 648C1009 616 1074 624 1118 668C1159 709 1162 776 1123 811C1081 849 999 834 966 783C939 741 924 672 960 648Z"
            />
            <path
              fill="url(#vmesh-land)"
              d="M158 662C214 630 292 650 324 700C350 741 337 796 292 820C240 848 160 815 139 762C124 724 128 679 158 662Z"
            />
          </g>
          <g fill="none" stroke="url(#vmesh-ridge)" strokeLinecap="round" strokeWidth="8">
            <path d="M154 294C220 280 272 305 333 333C394 361 451 365 511 339" />
            <path d="M454 610C507 650 562 670 626 661" />
            <path d="M718 222C791 212 850 236 912 278" />
            <path d="M840 482C891 462 933 462 982 489" />
          </g>
          <g fill="#edf3df" opacity="0.72">
            <path d="M214 170C244 150 286 154 312 180C283 195 247 195 214 170Z" />
            <path d="M740 137C778 111 826 116 858 146C820 165 780 165 740 137Z" />
            <path d="M480 737C520 715 572 724 602 762C557 775 516 767 480 737Z" />
          </g>
        </symbol>
      </defs>
      <rect width="2400" height="900" fill="transparent" />
      <use href="#vmesh-world-panel" x="0" y="0" width="1200" height="900" />
      <use href="#vmesh-world-panel" x="1200" y="0" width="1200" height="900" />
    </svg>
  );
}

function CloudTexture() {
  return (
    <svg
      className="vmesh-earth-cloud-map absolute inset-y-[-10%] -left-[55%] h-[120%] w-[210%]"
      viewBox="0 0 2200 900"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g fill="#ffffff" opacity="0.42">
        <path d="M128 218C198 180 292 190 356 239C281 266 195 261 128 218Z" />
        <path d="M490 138C570 104 690 126 742 190C657 212 554 198 490 138Z" />
        <path d="M850 574C936 532 1050 554 1118 628C1016 650 918 633 850 574Z" />
        <path d="M1196 254C1278 217 1382 230 1448 292C1355 317 1266 304 1196 254Z" />
        <path d="M1560 470C1642 436 1764 463 1816 530C1724 551 1626 534 1560 470Z" />
        <path d="M1895 180C1976 148 2070 163 2136 223C2044 244 1964 231 1895 180Z" />
      </g>
    </svg>
  );
}

export function EarthGlobeFallback() {
  return (
    <div className="vmesh-earth-fallback pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <div className="vmesh-earth-ocean absolute inset-0 rounded-full" />
      <WorldAtlasTexture />
      <CloudTexture />
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_31%_23%,rgba(236,248,255,0.36),transparent_22%),radial-gradient(circle_at_72%_66%,rgba(0,12,23,0.5),transparent_45%),linear-gradient(128deg,rgba(255,255,255,0.03),rgba(0,7,16,0.36))]" />
      <div className="vmesh-globe-grid absolute inset-0 rounded-full opacity-[0.36] mix-blend-soft-light" />
      <div className="vmesh-globe-tiles absolute inset-[1.5%] rounded-full opacity-[0.42] mix-blend-screen" />
      <div className="absolute inset-0 rounded-full shadow-[inset_34px_24px_70px_rgba(231,248,255,0.18),inset_-92px_-58px_122px_rgba(0,7,15,0.62)]" />
      <div className="absolute inset-[3.5%] rounded-full border border-[#d8eeff]/30" />
    </div>
  );
}
