export default function MarketplaceBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes ggm-clouddrift { from { transform: translateX(0) } to { transform: translateX(50px) } }
        @keyframes ggm-glow       { 0%, 100% { opacity: .12 } 50% { opacity: .22 } }
        @keyframes ggm-birds      { from { transform: translateX(0) } to { transform: translateX(34px) } }
        @keyframes ggm-hook       { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(7px) } }
        @keyframes ggm-flag       { 0%, 100% { transform: skewX(0deg) } 50% { transform: skewX(-8deg) } }
      `}</style>

      {/* Morning sky gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,#6fb0c6 0%,#9ecdd8 26%,#c9e6e4 50%,#e8f3ec 72%,#f6f2e0 88%,#fbefd6 100%)',
        }}
      />

      {/* Scene SVG — goods depot / container yard: warehouse + stacked containers under a
          gantry framed at the edges, open calm apron down the centre for the marketplace content */}
      <svg
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="ggm-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#a6cf6a" />
            <stop offset="1" stopColor="#77a844" />
          </linearGradient>
          <linearGradient id="ggm-apron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dbe0e6" />
            <stop offset="1" stopColor="#b0b8c2" />
          </linearGradient>
          <linearGradient id="ggm-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f6" />
            <stop offset="1" stopColor="#cbd4dd" />
          </linearGradient>
          <linearGradient id="ggm-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d8794" />
            <stop offset="1" stopColor="#565f6b" />
          </linearGradient>
          <g id="ggm-pine" fill="currentColor">
            <rect x="26" y="-16" width="9" height="22" fill="#3a2a1f" />
            <polygon points="30,-120 3,-58 57,-58" />
            <polygon points="30,-92 -3,-22 63,-22" />
            <polygon points="30,-64 -9,8 69,8" />
          </g>
          <g id="ggm-round" fill="currentColor">
            <rect x="-4" y="-14" width="8" height="26" fill="#4a3524" />
            <circle cx="0" cy="-44" r="34" />
            <circle cx="-24" cy="-28" r="24" />
            <circle cx="24" cy="-28" r="24" />
            <circle cx="0" cy="-20" r="26" />
          </g>
          <g id="ggm-palm">
            <path d="M-4,4 Q4,-70 -2,-118 Q10,-72 16,4 Z" fill="#2c3d24" />
            <g fill="#264a2e">
              <path d="M6,-116 Q-52,-118 -78,-86 Q-40,-104 6,-104 Z" />
              <path d="M6,-116 Q64,-120 92,-90 Q52,-106 6,-104 Z" />
              <path d="M6,-116 Q-38,-160 -78,-158 Q-30,-140 6,-108 Z" />
              <path d="M6,-116 Q50,-162 90,-158 Q42,-142 6,-108 Z" />
              <path d="M6,-116 Q4,-176 -14,-196 Q10,-152 6,-112 Z" />
            </g>
          </g>
          {/* GoodsGo roundel logo — red disc + white forward arrow */}
          <g id="ggm-logo">
            <circle cx="0" cy="0" r="22" fill="#d31905" />
            <path d="M-9,0 L9,0 M1,-9 L11,0 L1,9" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* reusable wooden crate */}
          <g id="ggm-crate">
            <rect x="0" y="0" width="64" height="56" rx="3" fill="#c08a45" />
            <rect x="0" y="0" width="64" height="12" rx="3" fill="#d29d55" />
            <rect x="0" y="0" width="64" height="56" rx="3" fill="none" stroke="#8a5f2c" strokeWidth="3" />
            <path d="M2,2 L62,54 M62,2 L2,54" stroke="#8a5f2c" strokeWidth="2.5" opacity="0.6" />
          </g>
          {/* reusable stacked sacks */}
          <g id="ggm-sacks">
            <path d="M2,40 Q-2,6 20,6 Q42,6 38,40 Z" fill="#d8c48f" />
            <path d="M34,40 Q30,10 52,10 Q74,10 70,40 Z" fill="#cdb87e" />
            <path d="M18,40 Q14,20 34,20 Q54,20 50,40 Z" fill="#e2d3a4" />
          </g>
          {/* pallet */}
          <g id="ggm-pallet" fill="#7a5330">
            <rect x="0" y="10" width="120" height="9" />
            <rect x="0" y="24" width="120" height="9" />
            <rect x="2" y="0" width="16" height="12" />
            <rect x="52" y="0" width="16" height="12" />
            <rect x="102" y="0" width="16" height="12" />
          </g>
        </defs>

        {/* Soft hazy morning sun — upper-left, clear of the centre */}
        <circle cx="250" cy="188" r="200" fill="#ffd98f" opacity="0.13" style={{ animation: 'ggm-glow 8s ease-in-out infinite' }} />
        <circle cx="250" cy="188" r="126" fill="#ffd98f" opacity="0.20" />
        <circle cx="250" cy="188" r="80" fill="#ffe3ab" />

        {/* Clouds hugging the top edge */}
        <g style={{ animation: 'ggm-clouddrift 36s ease-in-out infinite alternate' }} fill="#ffffff" opacity="0.88">
          <ellipse cx="620" cy="118" rx="66" ry="24" />
          <ellipse cx="676" cy="106" rx="52" ry="28" />
          <ellipse cx="568" cy="110" rx="44" ry="20" />
        </g>
        <g style={{ animation: 'ggm-clouddrift 48s ease-in-out infinite alternate-reverse' }} fill="#ffffff" opacity="0.74">
          <ellipse cx="1120" cy="150" rx="56" ry="20" />
          <ellipse cx="1168" cy="142" rx="44" ry="24" />
          <ellipse cx="1082" cy="144" rx="36" ry="17" />
        </g>

        {/* Birds, kept off-centre */}
        <g stroke="#5b7488" strokeWidth="3" fill="none" opacity="0.45" strokeLinecap="round" style={{ animation: 'ggm-birds 20s ease-in-out infinite alternate' }}>
          <path d="M760,150 q11,-9 22,0 q11,-9 22,0" />
          <path d="M828,132 q9,-7 18,0 q9,-7 18,0" />
        </g>

        {/* Distant hills (low, soft) */}
        <path d="M-20,470 L200,376 L380,440 L560,350 L740,462 L940,396 L1140,458 L1360,384 L1620,452 L1620,470 Z" fill="#bcd6da" />
        <path d="M-20,470 L180,422 L400,452 L620,414 L840,452 L1060,418 L1300,452 L1520,422 L1620,452 L1620,470 Z" fill="#a7c6b0" />

        {/* LEFT FRAME — GoodsGo Depot warehouse */}
        <g>
          <polygon points="30,356 366,356 340,320 56,320" fill="#c15a3b" />
          <polygon points="30,356 366,356 362,366 34,366" fill="#a8492f" />
          <rect x="44" y="356" width="308" height="118" fill="url(#ggm-wall)" />
          <rect x="44" y="356" width="308" height="26" fill="#003082" />
          <use href="#ggm-logo" x="72" y="369" style={{ transform: 'scale(0.6)', transformOrigin: '72px 369px' }} />
          <text x="90" y="376" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="19" fill="#ffffff" letterSpacing="0.4">GoodsGo Depot</text>
          {/* roller-shutter loading bays */}
          <g>
            <rect x="62" y="396" width="78" height="78" fill="#9aa6b3" />
            <rect x="62" y="396" width="78" height="78" fill="none" stroke="#7c8794" strokeWidth="2" />
            <g stroke="#828d9a" strokeWidth="2">
              <line x1="62" y1="410" x2="140" y2="410" /><line x1="62" y1="424" x2="140" y2="424" />
              <line x1="62" y1="438" x2="140" y2="438" /><line x1="62" y1="452" x2="140" y2="452" />
            </g>
            <rect x="158" y="396" width="78" height="78" fill="#9aa6b3" />
            <rect x="158" y="396" width="78" height="78" fill="none" stroke="#7c8794" strokeWidth="2" />
            <g stroke="#828d9a" strokeWidth="2">
              <line x1="158" y1="410" x2="236" y2="410" /><line x1="158" y1="424" x2="236" y2="424" />
              <line x1="158" y1="438" x2="236" y2="438" /><line x1="158" y1="452" x2="236" y2="452" />
            </g>
            <rect x="254" y="396" width="78" height="78" fill="#9aa6b3" />
            <rect x="254" y="396" width="78" height="78" fill="none" stroke="#7c8794" strokeWidth="2" />
            <g stroke="#828d9a" strokeWidth="2">
              <line x1="254" y1="410" x2="332" y2="410" /><line x1="254" y1="424" x2="332" y2="424" />
              <line x1="254" y1="438" x2="332" y2="438" /><line x1="254" y1="452" x2="332" y2="452" />
            </g>
          </g>
        </g>

        {/* RIGHT FRAME — gantry crane over stacked containers */}
        <g>
          {/* gantry */}
          <rect x="1178" y="360" width="14" height="200" fill="url(#ggm-steel)" />
          <rect x="1566" y="360" width="14" height="200" fill="url(#ggm-steel)" />
          <rect x="1166" y="344" width="426" height="20" rx="3" fill="url(#ggm-steel)" />
          <path d="M1192,364 L1240,420 M1580,364 L1532,420" stroke="#565f6b" strokeWidth="6" opacity="0.6" />
          {/* trolley + hook */}
          <g style={{ animation: 'ggm-hook 5s ease-in-out infinite' }}>
            <rect x="1352" y="342" width="44" height="14" rx="2" fill="#f5b60a" />
            <line x1="1374" y1="356" x2="1374" y2="404" stroke="#3a4048" strokeWidth="3" />
            <path d="M1374,404 q0,12 -9,12" stroke="#3a4048" strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
          {/* containers */}
          <g stroke="#00000022" strokeWidth="1">
            <rect x="1198" y="516" width="128" height="46" rx="2" fill="#2a8c74" />
            <rect x="1334" y="516" width="128" height="46" rx="2" fill="#c65a34" />
            <rect x="1470" y="516" width="110" height="46" rx="2" fill="#e0a52d" />
            <rect x="1232" y="466" width="128" height="46" rx="2" fill="#2f6fb0" />
            <rect x="1368" y="466" width="128" height="46" rx="2" fill="#3a9a80" />
            <rect x="1300" y="416" width="128" height="46" rx="2" fill="#c65a34" />
          </g>
          {/* container corrugation + doors */}
          <g stroke="#0000002e" strokeWidth="1.5" opacity="0.5">
            <line x1="1210" y1="516" x2="1210" y2="562" /><line x1="1226" y1="516" x2="1226" y2="562" /><line x1="1242" y1="516" x2="1242" y2="562" />
            <line x1="1348" y1="516" x2="1348" y2="562" /><line x1="1364" y1="516" x2="1364" y2="562" />
            <line x1="1246" y1="466" x2="1246" y2="512" /><line x1="1262" y1="466" x2="1262" y2="512" />
            <line x1="1382" y1="466" x2="1382" y2="512" /><line x1="1398" y1="466" x2="1398" y2="512" />
            <line x1="1314" y1="416" x2="1314" y2="462" /><line x1="1330" y1="416" x2="1330" y2="462" />
          </g>
          {/* small logo on the top container */}
          <use href="#ggm-logo" x="1400" y="439" style={{ transform: 'scale(0.5)', transformOrigin: '1400px 439px' }} />
        </g>

        {/* Ground field band */}
        <rect x="0" y="454" width="1600" height="158" fill="url(#ggm-field)" />
        <g stroke="#5f9433" strokeWidth="1.6" opacity="0.4">
          <line x1="40" y1="500" x2="360" y2="498" />
          <line x1="1240" y1="500" x2="1560" y2="498" />
        </g>

        {/* Concrete yard apron (full width, centre kept open) */}
        <rect x="0" y="600" width="1600" height="200" fill="url(#ggm-apron)" />
        <rect x="0" y="600" width="1600" height="5" fill="#c6cdd6" />
        {/* painted bay markings, only toward the edges */}
        <g stroke="#f2c94c" strokeWidth="4" opacity="0.55" strokeLinecap="round">
          <line x1="70" y1="660" x2="40" y2="740" /><line x1="200" y1="660" x2="176" y2="740" /><line x1="330" y1="660" x2="312" y2="740" />
          <line x1="1270" y1="660" x2="1290" y2="740" /><line x1="1400" y1="660" x2="1424" y2="740" /><line x1="1530" y1="660" x2="1560" y2="740" />
        </g>

        {/* FOREGROUND — LEFT: pallet with crates + sacks */}
        <g transform="translate(46,708)">
          <ellipse cx="130" cy="52" rx="180" ry="14" fill="#33404d" opacity="0.16" />
          <use href="#ggm-pallet" x="0" y="46" />
          <use href="#ggm-crate" x="8" y="-10" />
          <use href="#ggm-crate" x="74" y="-10" />
          <use href="#ggm-crate" x="41" y="-66" />
          <use href="#ggm-sacks" x="150" y="6" style={{ transform: 'scale(1.4)', transformOrigin: '150px 46px' }} />
        </g>

        {/* Parked GoodsGo forklift, lower-left of centre */}
        <g transform="translate(360,712)">
          <ellipse cx="70" cy="46" rx="96" ry="12" fill="#33404d" opacity="0.16" />
          {/* mast */}
          <rect x="16" y="-84" width="10" height="122" fill="#4a525c" />
          <rect x="30" y="-84" width="6" height="122" fill="#4a525c" />
          {/* fork */}
          <path d="M16,26 L-30,26 L-30,34 L16,34 Z" fill="#3a4048" />
          {/* carried box on fork */}
          <rect x="-34" y="-8" width="46" height="36" rx="3" fill="#c08a45" />
          <rect x="-34" y="-8" width="46" height="8" fill="#d29d55" />
          {/* body */}
          <rect x="44" y="-18" width="86" height="52" rx="6" fill="#f5b60a" />
          <rect x="44" y="-18" width="86" height="12" rx="6" fill="#ffce4d" />
          {/* cab / roll cage */}
          <path d="M60,-18 L60,-64 L120,-64 L120,-18" stroke="#3a4048" strokeWidth="6" fill="none" />
          <rect x="66" y="-58" width="48" height="34" fill="#bfe3f2" opacity="0.7" />
          <use href="#ggm-logo" x="150" y="6" style={{ transform: 'scale(0.5)', transformOrigin: '150px 6px' }} />
          <circle cx="66" cy="40" r="20" fill="#22262c" /><circle cx="66" cy="40" r="8" fill="#7a8592" />
          <circle cx="120" cy="40" r="14" fill="#22262c" /><circle cx="120" cy="40" r="6" fill="#7a8592" />
        </g>

        {/* FOREGROUND — RIGHT: pallet with shrink-wrapped boxes + crates */}
        <g transform="translate(1250,712)">
          <ellipse cx="150" cy="48" rx="190" ry="13" fill="#33404d" opacity="0.16" />
          <use href="#ggm-pallet" x="60" y="44" />
          <rect x="66" y="-8" width="108" height="52" rx="3" fill="#dfe6ec" />
          <rect x="66" y="-8" width="108" height="52" rx="3" fill="none" stroke="#b9c3cd" strokeWidth="2" />
          <path d="M120,-8 L120,44 M66,18 L174,18" stroke="#c3ccd5" strokeWidth="2" />
          <use href="#ggm-crate" x="188" y="-12" />
          <use href="#ggm-crate" x="252" y="-12" />
          <use href="#ggm-crate" x="220" y="-68" />
          {/* a small pennant flag on the pallet */}
          <line x1="66" y1="-8" x2="66" y2="-58" stroke="#7a5330" strokeWidth="3" />
          <path d="M66,-58 L112,-50 L66,-42 Z" fill="#d31905" style={{ animation: 'ggm-flag 3.4s ease-in-out infinite', transformOrigin: '66px -50px' }} />
        </g>

        {/* Framing trees — dense at the edges, open gap in the centre */}
        <g style={{ color: '#2b5347' }}>
          <use href="#ggm-pine" transform="translate(-40,690) scale(1.4)" />
          <use href="#ggm-round" transform="translate(1520,678) scale(1.05)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ggm-pine" transform="translate(-24,800) scale(1.7)" />
          <use href="#ggm-round" transform="translate(120,802) scale(1.15)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ggm-pine" transform="translate(1470,806) scale(1.6)" />
          <use href="#ggm-pine" transform="translate(1585,800) scale(1.5)" />
        </g>
        <use href="#ggm-palm" transform="translate(20,672) scale(0.92)" />
        <use href="#ggm-palm" transform="translate(1578,668) scale(1.0)" />
        <rect x="0" y="786" width="1600" height="16" fill="#1c3a31" />
      </svg>

      {/* Soft light halo behind the marketplace zone so content sits on calm, even light */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(760px,90vw)',
          height: 'min(660px,82vh)',
          transform: 'translate(-50%,-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.30) 42%, rgba(255,255,255,0) 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top/bottom scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(14,34,51,0.12) 0%, rgba(14,34,51,0) 26%, rgba(14,34,51,0) 74%, rgba(14,34,51,0.12) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
