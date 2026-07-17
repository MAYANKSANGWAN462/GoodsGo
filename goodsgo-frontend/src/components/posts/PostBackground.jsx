export default function PostBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes ggp-clouddrift { from { transform: translateX(0) } to { transform: translateX(48px) } }
        @keyframes ggp-glow       { 0%, 100% { opacity: .12 } 50% { opacity: .22 } }
        @keyframes ggp-birds      { from { transform: translateX(0) } to { transform: translateX(34px) } }
        @keyframes ggp-flutter    { 0%, 100% { transform: rotate(var(--r,0deg)) } 50% { transform: rotate(calc(var(--r,0deg) + 1.4deg)) } }
        @keyframes ggp-sway       { 0%, 100% { transform: skewX(0deg) } 50% { transform: skewX(-7deg) } }
      `}</style>

      {/* Dusk sky gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,#5b6ba8 0%,#8a86bd 24%,#c39dc0 48%,#e8aa9e 70%,#f6c79a 87%,#ffe0b0 100%)',
        }}
      />

      {/* Scene SVG — dispatch yard: "post your load" pin-board + destination signpost + packing
          bench framed at the edges, calm open plaza down the centre for the create-post form */}
      <svg
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="ggp-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#96b56f" />
            <stop offset="1" stopColor="#6e934a" />
          </linearGradient>
          <linearGradient id="ggp-apron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e3d7c8" />
            <stop offset="1" stopColor="#c1b2a0" />
          </linearGradient>
          <linearGradient id="ggp-cork" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9b98a" />
            <stop offset="1" stopColor="#c19f6c" />
          </linearGradient>
          <linearGradient id="ggp-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7d8794" />
            <stop offset="1" stopColor="#565f6b" />
          </linearGradient>
          <g id="ggp-pine" fill="currentColor">
            <rect x="26" y="-16" width="9" height="22" fill="#3a2a1f" />
            <polygon points="30,-120 3,-58 57,-58" />
            <polygon points="30,-92 -3,-22 63,-22" />
            <polygon points="30,-64 -9,8 69,8" />
          </g>
          <g id="ggp-round" fill="currentColor">
            <rect x="-4" y="-14" width="8" height="26" fill="#4a3524" />
            <circle cx="0" cy="-44" r="34" />
            <circle cx="-24" cy="-28" r="24" />
            <circle cx="24" cy="-28" r="24" />
            <circle cx="0" cy="-20" r="26" />
          </g>
          <g id="ggp-palm">
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
          <g id="ggp-logo">
            <circle cx="0" cy="0" r="22" fill="#d31905" />
            <path d="M-9,0 L9,0 M1,-9 L11,0 L1,9" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* box with a shipping label */}
          <g id="ggp-box">
            <rect x="0" y="0" width="92" height="66" rx="3" fill="#c79a5f" />
            <rect x="0" y="0" width="92" height="12" rx="3" fill="#d9b077" />
            <rect x="38" y="0" width="16" height="66" fill="#efe3c2" opacity="0.9" />
            <rect x="8" y="34" width="42" height="26" rx="2" fill="#ffffff" />
            <g stroke="#2a2f36" strokeWidth="1.6">
              <line x1="12" y1="40" x2="12" y2="54" /><line x1="16" y1="40" x2="16" y2="54" />
              <line x1="21" y1="40" x2="21" y2="54" /><line x1="27" y1="40" x2="27" y2="54" />
              <line x1="31" y1="40" x2="31" y2="54" />
            </g>
            <circle cx="42" cy="47" r="6" fill="#d31905" />
            <path d="M39,47 L45,47 M43,44 L46,47 L43,50" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </defs>

        {/* Soft hazy low sun — upper-right corner, clear of the centre */}
        <circle cx="1360" cy="196" r="200" fill="#ffb27a" opacity="0.13" style={{ animation: 'ggp-glow 8s ease-in-out infinite' }} />
        <circle cx="1360" cy="196" r="124" fill="#ffb27a" opacity="0.20" />
        <circle cx="1360" cy="196" r="80" fill="#ffcaa0" />

        {/* Clouds hugging the top edge */}
        <g style={{ animation: 'ggp-clouddrift 38s ease-in-out infinite alternate' }} fill="#ffffff" opacity="0.82">
          <ellipse cx="440" cy="120" rx="64" ry="23" />
          <ellipse cx="494" cy="108" rx="50" ry="27" />
          <ellipse cx="392" cy="112" rx="42" ry="19" />
        </g>
        <g style={{ animation: 'ggp-clouddrift 50s ease-in-out infinite alternate-reverse' }} fill="#ffffff" opacity="0.68">
          <ellipse cx="900" cy="150" rx="54" ry="19" />
          <ellipse cx="946" cy="142" rx="42" ry="23" />
          <ellipse cx="864" cy="144" rx="34" ry="16" />
        </g>

        {/* Birds, kept off-centre */}
        <g stroke="#6a6b98" strokeWidth="3" fill="none" opacity="0.42" strokeLinecap="round" style={{ animation: 'ggp-birds 20s ease-in-out infinite alternate' }}>
          <path d="M640,150 q11,-9 22,0 q11,-9 22,0" />
          <path d="M708,132 q9,-7 18,0 q9,-7 18,0" />
        </g>

        {/* Distant hills (low, soft) */}
        <path d="M-20,470 L200,378 L380,442 L560,352 L740,462 L940,398 L1140,458 L1360,386 L1620,452 L1620,470 Z" fill="#b9aecf" />
        <path d="M-20,470 L180,424 L400,452 L620,416 L840,452 L1060,420 L1300,452 L1520,424 L1620,452 L1620,470 Z" fill="#a6a3c4" />

        {/* LEFT FRAME — "Post your load" cork notice board */}
        <g>
          <rect x="100" y="416" width="12" height="158" fill="url(#ggp-steel)" />
          <rect x="336" y="416" width="12" height="158" fill="url(#ggp-steel)" />
          <rect x="68" y="290" width="312" height="150" rx="8" fill="#7a5330" />
          <rect x="80" y="302" width="288" height="126" fill="url(#ggp-cork)" />
          <rect x="80" y="302" width="288" height="28" fill="#003082" />
          <use href="#ggp-logo" x="104" y="316" style={{ transform: 'scale(0.55)', transformOrigin: '104px 316px' }} />
          <text x="122" y="323" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="17" fill="#ffffff" letterSpacing="0.4">Post your load</text>
          {/* pinned cards */}
          <g style={{ '--r': '-3deg', animation: 'ggp-flutter 5s ease-in-out infinite', transformOrigin: '150px 344px' }}>
            <rect x="94" y="344" width="120" height="78" rx="4" fill="#fdfbf5" stroke="#e4dcc8" strokeWidth="1.5" />
            <g stroke="#b7c0cb" strokeWidth="3" strokeLinecap="round">
              <line x1="104" y1="366" x2="196" y2="366" /><line x1="104" y1="378" x2="180" y2="378" />
            </g>
            <rect x="104" y="392" width="46" height="16" rx="4" fill="#e8f2fb" />
            <text x="110" y="404" fontFamily="'Barlow',sans-serif" fontWeight="600" fontSize="10" fill="#0d68b1">3 T</text>
            <circle cx="154" cy="344" r="5" fill="#d31905" />
          </g>
          <g style={{ '--r': '3deg', animation: 'ggp-flutter 6s ease-in-out .6s infinite', transformOrigin: '296px 342px' }}>
            <rect x="236" y="342" width="120" height="78" rx="4" fill="#fdfbf5" stroke="#e4dcc8" strokeWidth="1.5" />
            <g stroke="#b7c0cb" strokeWidth="3" strokeLinecap="round">
              <line x1="246" y1="364" x2="338" y2="364" /><line x1="246" y1="376" x2="320" y2="376" />
            </g>
            <rect x="246" y="390" width="52" height="16" rx="4" fill="#e6f6ef" />
            <text x="252" y="402" fontFamily="'Barlow',sans-serif" fontWeight="600" fontSize="10" fill="#2a8c74">8 T</text>
            <circle cx="296" cy="342" r="5" fill="#f5b60a" />
          </g>
        </g>

        {/* RIGHT FRAME — packing bench with labelled boxes + weighing scale */}
        <g>
          {/* bench */}
          <rect x="1176" y="524" width="372" height="16" rx="3" fill="#a9793f" />
          <rect x="1176" y="524" width="372" height="5" fill="#c08f4f" />
          <rect x="1198" y="540" width="14" height="66" fill="#6b4a2a" />
          <rect x="1512" y="540" width="14" height="66" fill="#6b4a2a" />
          {/* boxes on the bench */}
          <use href="#ggp-box" x="1214" y="458" />
          <use href="#ggp-box" x="1236" y="392" />
          <use href="#ggp-box" x="1316" y="474" style={{ transform: 'scale(0.82)', transformOrigin: '1316px 474px' }} />
          {/* packing-tape roll */}
          <g transform="translate(1300,436)">
            <circle cx="0" cy="0" r="16" fill="#efe3c2" />
            <circle cx="0" cy="0" r="7" fill="#c1b28c" />
          </g>
          {/* weighing scale */}
          <g>
            <rect x="1428" y="500" width="96" height="10" rx="3" fill="#8b95a2" />
            <rect x="1466" y="474" width="20" height="28" fill="#6a727d" />
            <circle cx="1476" cy="462" r="24" fill="#eef2f6" stroke="#8b95a2" strokeWidth="3" />
            <line x1="1476" y1="462" x2="1486" y2="450" stroke="#d31905" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="1476" cy="462" r="2.5" fill="#3a4048" />
          </g>
        </g>

        {/* Ground field band */}
        <rect x="0" y="454" width="1600" height="158" fill="url(#ggp-field)" />
        <g stroke="#557f36" strokeWidth="1.6" opacity="0.4">
          <line x1="40" y1="500" x2="360" y2="498" />
          <line x1="1240" y1="500" x2="1560" y2="498" />
        </g>

        {/* Plaza apron (full width, centre kept open) */}
        <rect x="0" y="600" width="1600" height="200" fill="url(#ggp-apron)" />
        <rect x="0" y="600" width="1600" height="5" fill="#cabca9" />
        <g stroke="#c9a24a" strokeWidth="4" opacity="0.4" strokeLinecap="round">
          <line x1="80" y1="662" x2="52" y2="740" /><line x1="210" y1="662" x2="186" y2="740" />
          <line x1="1400" y1="662" x2="1424" y2="740" /><line x1="1530" y1="662" x2="1560" y2="740" />
        </g>

        {/* FOREGROUND — destination signpost (left of centre) */}
        <g transform="translate(310,566)">
          <ellipse cx="6" cy="176" rx="70" ry="12" fill="#33404d" opacity="0.16" />
          <rect x="0" y="0" width="14" height="176" fill="#6b4a2a" />
          <rect x="0" y="0" width="14" height="176" fill="none" stroke="#553a20" strokeWidth="1.5" />
          {/* arrow signs pointing left, away from the centre */}
          <g style={{ animation: 'ggp-sway 5s ease-in-out infinite', transformOrigin: '14px 22px' }}>
            <path d="M14,10 L-96,10 L-114,24 L-96,38 L14,38 Z" fill="#2a8c74" />
            <text x="-90" y="29" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="15" fill="#ffffff">PUNE</text>
          </g>
          <g style={{ animation: 'ggp-sway 6s ease-in-out .5s infinite', transformOrigin: '14px 58px' }}>
            <path d="M14,46 L-108,46 L-126,60 L-108,74 L14,74 Z" fill="#d31905" />
            <text x="-102" y="65" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="15" fill="#ffffff">DELHI</text>
          </g>
          <g style={{ animation: 'ggp-sway 5.6s ease-in-out .9s infinite', transformOrigin: '14px 94px' }}>
            <path d="M14,82 L-88,82 L-106,96 L-88,110 L14,110 Z" fill="#003082" />
            <text x="-82" y="101" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="15" fill="#ffffff">SURAT</text>
          </g>
        </g>

        {/* FOREGROUND right corner — wrapped parcel stack + clipboard */}
        <g transform="translate(1330,706)">
          <ellipse cx="120" cy="52" rx="150" ry="13" fill="#33404d" opacity="0.16" />
          <use href="#ggp-box" x="60" y="-14" />
          <use href="#ggp-box" x="150" y="-2" style={{ transform: 'scale(0.9)', transformOrigin: '150px -2px' }} />
          <use href="#ggp-box" x="96" y="-78" style={{ transform: 'scale(0.86)', transformOrigin: '96px -78px' }} />
          {/* leaning clipboard with a pen */}
          <g transform="translate(6,-70) rotate(-8)">
            <rect x="0" y="0" width="58" height="80" rx="4" fill="#e7d9a6" />
            <rect x="10" y="10" width="38" height="58" rx="2" fill="#fdfbf5" />
            <rect x="18" y="-6" width="22" height="12" rx="3" fill="#8b95a2" />
            <g stroke="#c3ccd5" strokeWidth="2.5" strokeLinecap="round">
              <line x1="16" y1="24" x2="42" y2="24" /><line x1="16" y1="34" x2="42" y2="34" /><line x1="16" y1="44" x2="34" y2="44" />
            </g>
            <line x1="30" y1="52" x2="52" y2="70" stroke="#d31905" strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>

        {/* Framing trees — dense at the edges, open gap in the centre */}
        <g style={{ color: '#2b5347' }}>
          <use href="#ggp-pine" transform="translate(-40,690) scale(1.4)" />
          <use href="#ggp-round" transform="translate(1520,678) scale(1.05)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ggp-pine" transform="translate(-24,800) scale(1.7)" />
          <use href="#ggp-round" transform="translate(120,802) scale(1.15)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ggp-pine" transform="translate(1470,806) scale(1.6)" />
          <use href="#ggp-pine" transform="translate(1585,800) scale(1.5)" />
        </g>
        <use href="#ggp-palm" transform="translate(20,672) scale(0.92)" />
        <use href="#ggp-palm" transform="translate(1578,668) scale(1.0)" />
        <rect x="0" y="786" width="1600" height="16" fill="#1c3a31" />
      </svg>

      {/* Soft warm halo behind the form zone so content sits on calm, even light */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(760px,90vw)',
          height: 'min(680px,84vh)',
          transform: 'translate(-50%,-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(255,250,240,0.56) 0%, rgba(255,250,240,0.30) 42%, rgba(255,250,240,0) 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top/bottom scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(42,42,68,0.14) 0%, rgba(42,42,68,0) 26%, rgba(42,42,68,0) 74%, rgba(42,42,68,0.14) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
