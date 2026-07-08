export default function ChatBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes ggc-clouddrift { from { transform: translateX(0) } to { transform: translateX(54px) } }
        @keyframes ggc-glow       { 0%, 100% { opacity: .12 } 50% { opacity: .24 } }
        @keyframes ggc-birds      { from { transform: translateX(0) } to { transform: translateX(38px) } }
      `}</style>

      {/* Sky gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,#2b7fc6 0%,#59a6de 28%,#9fd0ee 52%,#d7ecf7 70%,#ffe6bd 87%,#ffd69c 100%)',
        }}
      />

      {/* Scene SVG — detail at edges/bottom; centre stays open sky/road */}
      <svg
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="ggc-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9ccb5c" />
            <stop offset="1" stopColor="#6ba33a" />
          </linearGradient>
          <linearGradient id="ggc-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b6675" />
            <stop offset="1" stopColor="#3c4552" />
          </linearGradient>
          <linearGradient id="ggc-verge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5f8f3f" />
            <stop offset="1" stopColor="#3c6329" />
          </linearGradient>
          <linearGradient id="ggc-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f6" />
            <stop offset="1" stopColor="#cdd6df" />
          </linearGradient>
          <linearGradient id="ggc-canopy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a3f9c" />
            <stop offset="1" stopColor="#003082" />
          </linearGradient>
          <g id="ggc-pine" fill="currentColor">
            <rect x="26" y="-16" width="9" height="22" fill="#3a2a1f" />
            <polygon points="30,-120 3,-58 57,-58" />
            <polygon points="30,-92 -3,-22 63,-22" />
            <polygon points="30,-64 -9,8 69,8" />
          </g>
          <g id="ggc-round" fill="currentColor">
            <rect x="-4" y="-14" width="8" height="26" fill="#4a3524" />
            <circle cx="0" cy="-44" r="34" />
            <circle cx="-24" cy="-28" r="24" />
            <circle cx="24" cy="-28" r="24" />
            <circle cx="0" cy="-20" r="26" />
          </g>
          <g id="ggc-palm">
            <path d="M-4,4 Q4,-70 -2,-118 Q10,-72 16,4 Z" fill="#2c3d24" />
            <g fill="#264a2e">
              <path d="M6,-116 Q-52,-118 -78,-86 Q-40,-104 6,-104 Z" />
              <path d="M6,-116 Q64,-120 92,-90 Q52,-106 6,-104 Z" />
              <path d="M6,-116 Q-38,-160 -78,-158 Q-30,-140 6,-108 Z" />
              <path d="M6,-116 Q50,-162 90,-158 Q42,-142 6,-108 Z" />
              <path d="M6,-116 Q4,-176 -14,-196 Q10,-152 6,-112 Z" />
            </g>
          </g>
        </defs>

        {/* Sun — upper-right corner, clear of centre */}
        <circle cx="1418" cy="212" r="210" fill="#ffb04a" opacity="0.13" style={{ animation: 'ggc-glow 7s ease-in-out infinite' }} />
        <circle cx="1418" cy="212" r="132" fill="#ffb04a" opacity="0.18" />
        <circle cx="1418" cy="212" r="84" fill="#ffc247" />

        {/* Clouds */}
        <g style={{ animation: 'ggc-clouddrift 32s ease-in-out infinite alternate' }} fill="#ffffff" opacity="0.9">
          <ellipse cx="300" cy="120" rx="70" ry="25" />
          <ellipse cx="356" cy="108" rx="54" ry="29" />
          <ellipse cx="248" cy="112" rx="48" ry="22" />
        </g>
        <g style={{ animation: 'ggc-clouddrift 44s ease-in-out infinite alternate-reverse' }} fill="#ffffff" opacity="0.78">
          <ellipse cx="1080" cy="150" rx="58" ry="21" />
          <ellipse cx="1130" cy="142" rx="46" ry="25" />
          <ellipse cx="1040" cy="144" rx="38" ry="18" />
        </g>

        {/* Birds */}
        <g
          stroke="#3a4f6a"
          strokeWidth="3"
          fill="none"
          opacity="0.5"
          strokeLinecap="round"
          style={{ animation: 'ggc-birds 18s ease-in-out infinite alternate' }}
        >
          <path d="M250,220 q11,-9 22,0 q11,-9 22,0" />
          <path d="M318,200 q9,-7 18,0 q9,-7 18,0" />
        </g>

        {/* Distant hills */}
        <path d="M-20,470 L200,372 L380,438 L560,344 L740,462 L940,392 L1140,458 L1360,382 L1620,452 L1620,470 Z" fill="#c6d8ee" />
        <path d="M-20,470 L180,420 L400,452 L620,412 L840,450 L1060,416 L1300,452 L1520,420 L1620,452 L1620,470 Z" fill="#9fb9db" />

        {/* LEFT FRAME — GoodsGo Stop */}
        <g>
          <rect x="60" y="392" width="250" height="76" fill="url(#ggc-wall)" />
          <polygon points="46,392 324,392 285,356 85,356" fill="#c15a3b" />
          <polygon points="46,392 324,392 320,404 50,404" fill="#a8492f" />
          <rect x="60" y="360" width="250" height="30" fill="#003082" />
          <circle cx="92" cy="375" r="10" fill="#d31905" />
          <path d="M87,375 L97,375 M92,369 L98,375 L92,381" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="112" y="384" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="20" fill="#ffffff" letterSpacing="0.4">GoodsGo Stop</text>
          <rect x="80" y="408" width="46" height="40" fill="#bfe3f2" />
          <rect x="80" y="408" width="46" height="8" fill="#d9f1fb" />
          <rect x="150" y="408" width="46" height="40" fill="#bfe3f2" />
          <rect x="150" y="408" width="46" height="8" fill="#d9f1fb" />
          <rect x="228" y="414" width="42" height="54" fill="#7a5a34" />
          <circle cx="262" cy="442" r="3" fill="#ffd257" />
          <rect x="300" y="452" width="16" height="16" fill="#8892a0" />
        </g>

        {/* RIGHT FRAME — Fuel & EV charging canopy */}
        <g>
          <rect x="1300" y="336" width="14" height="132" fill="#556070" />
          <rect x="1506" y="336" width="14" height="132" fill="#556070" />
          <rect x="1276" y="316" width="268" height="30" rx="5" fill="url(#ggc-canopy)" />
          <rect x="1276" y="316" width="268" height="7" rx="5" fill="#1a56c4" />
          <text x="1410" y="337" textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="18" fill="#ffffff" letterSpacing="0.5">FUEL &amp; CHARGE</text>
          <rect x="1338" y="404" width="34" height="64" rx="4" fill="#d31905" />
          <rect x="1342" y="412" width="26" height="20" fill="#ffd9cf" />
          <rect x="1450" y="404" width="34" height="64" rx="4" fill="#2a8c74" />
          <rect x="1454" y="412" width="26" height="20" fill="#d6f3ea" />
          <rect x="1382" y="424" width="60" height="44" fill="url(#ggc-wall)" />
          <rect x="1388" y="430" width="48" height="18" fill="#bfe3f2" />
        </g>

        {/* Grass field */}
        <rect x="0" y="454" width="1600" height="158" fill="url(#ggc-field)" />
        <g opacity="0.85">
          <polygon points="0,470 520,468 400,560 0,568" fill="#7cb342" />
          <polygon points="520,468 1090,470 1090,560 400,560" fill="#93c552" />
          <polygon points="1090,470 1600,468 1600,568 1090,560" fill="#79ac3d" />
        </g>
        <g stroke="#4f7d2c" strokeWidth="2.5" opacity="0.45">
          <line x1="0" y1="512" x2="1600" y2="512" />
          <line x1="400" y1="560" x2="340" y2="612" />
          <line x1="1090" y1="470" x2="1090" y2="612" />
        </g>
        <g stroke="#5f9433" strokeWidth="1.6" opacity="0.4">
          <line x1="40" y1="486" x2="360" y2="484" />
          <line x1="40" y1="500" x2="350" y2="498" />
          <line x1="1240" y1="486" x2="1560" y2="486" />
          <line x1="1240" y1="500" x2="1560" y2="500" />
        </g>

        {/* Road */}
        <rect x="0" y="606" width="1600" height="8" fill="#3c6329" />
        <rect x="0" y="612" width="1600" height="62" fill="url(#ggc-road)" />
        <rect x="0" y="612" width="1600" height="4" fill="#6a7686" />
        <rect x="0" y="670" width="1600" height="6" fill="#28313d" />
        <rect x="0" y="620" width="1600" height="4" fill="#e6ecf2" opacity="0.5" />
        <rect x="0" y="662" width="1600" height="4" fill="#e6ecf2" opacity="0.5" />
        <g fill="#e9c24a" opacity="0.85">
          <rect x="120" y="641" width="34" height="5" />
          <rect x="210" y="641" width="34" height="5" />
          <rect x="300" y="641" width="34" height="5" />
          <rect x="700" y="641" width="34" height="5" />
          <rect x="790" y="641" width="34" height="5" />
          <rect x="1180" y="641" width="34" height="5" />
          <rect x="1270" y="641" width="34" height="5" />
          <rect x="1360" y="641" width="34" height="5" />
          <rect x="1450" y="641" width="34" height="5" />
        </g>

        {/* Foreground verge */}
        <rect x="0" y="674" width="1600" height="126" fill="url(#ggc-verge)" />

        {/* Blue box truck — bottom-left */}
        <g transform="translate(70,672) scale(0.92)">
          <ellipse cx="130" cy="4" rx="150" ry="11" fill="#12233a" opacity="0.18" />
          <rect x="0" y="-134" width="176" height="104" rx="7" fill="#eef3f8" />
          <rect x="0" y="-134" width="176" height="14" rx="7" fill="#dbe6f1" />
          <rect x="0" y="-74" width="176" height="20" fill="#003082" />
          <line x1="88" y1="-134" x2="88" y2="-30" stroke="#cdd8e5" strokeWidth="3" />
          <circle cx="46" cy="-98" r="13" fill="#d31905" />
          <path d="M40,-98 L52,-98 M46,-105 L53,-98 L46,-91" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M176,-30 L176,-104 Q176,-112 184,-112 L232,-112 Q262,-112 262,-78 L262,-30 Z" fill="#003082" />
          <path d="M198,-104 L236,-104 Q248,-104 250,-82 L204,-82 Q198,-82 198,-88 Z" fill="#bfe3f2" />
          <rect x="176" y="-46" width="88" height="16" fill="#0a1f4a" />
          <circle cx="256" cy="-40" r="5" fill="#ffd257" />
          <rect x="0" y="-32" width="262" height="10" fill="#26313f" />
          <circle cx="54" cy="-20" r="23" fill="#22262c" />
          <circle cx="54" cy="-20" r="10" fill="#7a8592" />
          <circle cx="54" cy="-20" r="4" fill="#c7ced6" />
          <circle cx="212" cy="-20" r="23" fill="#22262c" />
          <circle cx="212" cy="-20" r="10" fill="#7a8592" />
          <circle cx="212" cy="-20" r="4" fill="#c7ced6" />
        </g>

        {/* Indian goods three-wheeler — bottom-right */}
        <g transform="translate(1300,674) scale(0.92)">
          <ellipse cx="92" cy="3" rx="105" ry="8" fill="#12233a" opacity="0.16" />
          <rect x="6" y="-98" width="112" height="74" rx="5" fill="#f2f5f9" />
          <rect x="6" y="-98" width="112" height="13" rx="5" fill="#003082" />
          <rect x="6" y="-98" width="10" height="74" fill="#003082" />
          <line x1="70" y1="-98" x2="70" y2="-24" stroke="#cdd8e5" strokeWidth="2.5" />
          <circle cx="40" cy="-58" r="9" fill="#d31905" />
          <path d="M118,-24 L118,-92 Q118,-100 128,-100 L150,-100 Q176,-96 180,-56 L182,-24 Z" fill="#f5b60a" />
          <path d="M132,-92 L150,-92 Q168,-90 172,-60 L136,-60 Q132,-60 132,-66 Z" fill="#bfe3f2" />
          <rect x="118" y="-102" width="62" height="10" rx="4" fill="#1a1a1a" />
          <rect x="0" y="-26" width="182" height="7" fill="#2a2f36" />
          <circle cx="150" cy="-16" r="18" fill="#22262c" />
          <circle cx="150" cy="-16" r="7" fill="#8a929d" />
          <circle cx="46" cy="-16" r="18" fill="#22262c" />
          <circle cx="46" cy="-16" r="7" fill="#8a929d" />
        </g>

        {/* Foreground trees — dense at edges, open gap in the centre */}
        <g style={{ color: '#2b5347' }}>
          <use href="#ggc-pine" transform="translate(-40,690) scale(1.4)" />
          <use href="#ggc-round" transform="translate(330,676) scale(1.1)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ggc-pine" transform="translate(-20,800) scale(1.7)" />
          <use href="#ggc-pine" transform="translate(110,806) scale(1.5)" />
          <use href="#ggc-round" transform="translate(240,800) scale(1.2)" />
          <use href="#ggc-pine" transform="translate(360,808) scale(1.4)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ggc-pine" transform="translate(1200,808) scale(1.4)" />
          <use href="#ggc-round" transform="translate(1330,800) scale(1.25)" />
          <use href="#ggc-pine" transform="translate(1450,808) scale(1.6)" />
          <use href="#ggc-pine" transform="translate(1580,802) scale(1.5)" />
        </g>
        <g style={{ color: '#2b5347' }}>
          <use href="#ggc-round" transform="translate(1500,678) scale(1.05)" />
        </g>
        <use href="#ggc-palm" transform="translate(24,672) scale(0.92)" />
        <use href="#ggc-palm" transform="translate(1576,668) scale(1.0)" />
        <rect x="0" y="784" width="1600" height="18" fill="#1c3a31" />
      </svg>

      {/* White radial halo behind the chat zone — keeps panels readable */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(720px,88vw)',
          height: 'min(620px,80vh)',
          transform: 'translate(-50%,-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.28) 42%, rgba(255,255,255,0) 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Gentle top/bottom scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(12,27,48,0.14) 0%, rgba(12,27,48,0) 26%, rgba(12,27,48,0) 74%, rgba(12,27,48,0.12) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
