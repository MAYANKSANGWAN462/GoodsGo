export default function BookingBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes ggb-clouddrift { from { transform: translateX(0) } to { transform: translateX(46px) } }
        @keyframes ggb-glow        { 0%, 100% { opacity: .12 } 50% { opacity: .22 } }
        @keyframes ggb-twinkle     { 0%, 100% { opacity: .25 } 50% { opacity: .9 } }
        @keyframes ggb-beacon      { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
      `}</style>

      {/* Night sky gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,#08172e 0%,#0f2544 30%,#173a63 52%,#28517e 70%,#6b4a5e 87%,#c9704a 100%)',
        }}
      />

      {/* Scene SVG — lit billboard + glowing hub at edges; dark calm sky/road at centre */}
      <svg
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="ggb-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2c4a30" />
            <stop offset="1" stopColor="#16301f" />
          </linearGradient>
          <linearGradient id="ggb-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b3340" />
            <stop offset="1" stopColor="#161c24" />
          </linearGradient>
          <linearGradient id="ggb-verge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#213c28" />
            <stop offset="1" stopColor="#122417" />
          </linearGradient>
          <linearGradient id="ggb-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4658" />
            <stop offset="1" stopColor="#232c39" />
          </linearGradient>
          <radialGradient id="ggb-lamp" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
          <g id="ggb-pine" fill="currentColor">
            <rect x="26" y="-16" width="9" height="22" fill="#14251c" />
            <polygon points="30,-120 3,-58 57,-58" />
            <polygon points="30,-92 -3,-22 63,-22" />
            <polygon points="30,-64 -9,8 69,8" />
          </g>
          <g id="ggb-round" fill="currentColor">
            <rect x="-4" y="-14" width="8" height="26" fill="#14251c" />
            <circle cx="0" cy="-44" r="34" />
            <circle cx="-24" cy="-28" r="24" />
            <circle cx="24" cy="-28" r="24" />
            <circle cx="0" cy="-20" r="26" />
          </g>
          <g id="ggb-palm">
            <path d="M-4,4 Q4,-70 -2,-118 Q10,-72 16,4 Z" fill="#14251c" />
            <g fill="#14281c">
              <path d="M6,-116 Q-52,-118 -78,-86 Q-40,-104 6,-104 Z" />
              <path d="M6,-116 Q64,-120 92,-90 Q52,-106 6,-104 Z" />
              <path d="M6,-116 Q-38,-160 -78,-158 Q-30,-140 6,-108 Z" />
              <path d="M6,-116 Q50,-162 90,-158 Q42,-142 6,-108 Z" />
              <path d="M6,-116 Q4,-176 -14,-196 Q10,-152 6,-112 Z" />
            </g>
          </g>
          {/* GoodsGo roundel logo — red disc + white forward arrow */}
          <g id="ggb-logo">
            <circle cx="0" cy="0" r="22" fill="#d31905" />
            <path d="M-9,0 L9,0 M1,-9 L11,0 L1,9" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </defs>

        {/* Stars — top corners */}
        <g fill="#ffffff">
          <circle cx="120"  cy="70"  r="2"   opacity="0.8"  style={{ animation: 'ggb-twinkle 3.2s ease-in-out infinite' }} />
          <circle cx="230"  cy="120" r="1.6" opacity="0.6"  style={{ animation: 'ggb-twinkle 4s ease-in-out 0.5s infinite' }} />
          <circle cx="360"  cy="60"  r="1.8" opacity="0.7"  style={{ animation: 'ggb-twinkle 3.6s ease-in-out 0.9s infinite' }} />
          <circle cx="520"  cy="96"  r="1.5" opacity="0.55" style={{ animation: 'ggb-twinkle 4.4s ease-in-out 0.3s infinite' }} />
          <circle cx="700"  cy="54"  r="1.6" opacity="0.6"  style={{ animation: 'ggb-twinkle 3.8s ease-in-out 1.1s infinite' }} />
          <circle cx="980"  cy="80"  r="1.6" opacity="0.6"  style={{ animation: 'ggb-twinkle 4.2s ease-in-out 0.7s infinite' }} />
          <circle cx="1130" cy="120" r="1.8" opacity="0.7"  style={{ animation: 'ggb-twinkle 3.4s ease-in-out 0.2s infinite' }} />
          <circle cx="1250" cy="60"  r="1.5" opacity="0.55" style={{ animation: 'ggb-twinkle 4s ease-in-out 1s infinite' }} />
          <circle cx="1520" cy="120" r="2"   opacity="0.8"  style={{ animation: 'ggb-twinkle 3.6s ease-in-out 0.4s infinite' }} />
        </g>

        {/* Moon — upper-right corner */}
        <circle cx="1400" cy="176" r="150" fill="#dfe6f0" opacity="0.12" style={{ animation: 'ggb-glow 8s ease-in-out infinite' }} />
        <circle cx="1400" cy="176" r="88" fill="#dfe6f0" opacity="0.16" />
        <circle cx="1400" cy="176" r="62" fill="#f4f1e0" />
        <g fill="#0f2544" opacity="0.10">
          <circle cx="1382" cy="160" r="12" />
          <circle cx="1418" cy="190" r="9" />
          <circle cx="1396" cy="200" r="6" />
        </g>

        {/* Thin drifting cloud */}
        <g style={{ animation: 'ggb-clouddrift 40s ease-in-out infinite alternate' }} fill="#3a5478" opacity="0.4">
          <ellipse cx="560" cy="150" rx="80" ry="16" />
          <ellipse cx="640" cy="158" rx="60" ry="12" />
        </g>

        {/* Distant city skyline — taller/brighter at edges, low/dim at centre */}
        <g>
          <g fill="#122a4e">
            <rect x="30" y="392" width="34" height="80" />
            <rect x="72" y="360" width="40" height="112" />
            <rect x="120" y="410" width="30" height="62" />
            <rect x="360" y="378" width="38" height="94" />
            <rect x="404" y="404" width="30" height="68" />
          </g>
          <g fill="#0f2848">
            <rect x="620" y="440" width="30" height="32" />
            <rect x="680" y="446" width="26" height="26" />
            <rect x="900" y="444" width="28" height="28" />
            <rect x="960" y="438" width="30" height="34" />
          </g>
          <g fill="#122a4e">
            <rect x="1180" y="384" width="38" height="88" />
            <rect x="1224" y="360" width="34" height="112" />
            <rect x="1560" y="374" width="40" height="98" />
          </g>
          <g fill="#ffcf7a" opacity="0.85">
            <rect x="40" y="404" width="6" height="8" /><rect x="52" y="420" width="6" height="8" />
            <rect x="82" y="374" width="6" height="9" /><rect x="96" y="392" width="6" height="9" />
            <rect x="82" y="410" width="6" height="9" /><rect x="128" y="424" width="5" height="7" />
            <rect x="370" y="392" width="6" height="9" /><rect x="384" y="410" width="6" height="9" />
            <rect x="412" y="418" width="5" height="7" />
            <rect x="1190" y="398" width="6" height="9" /><rect x="1204" y="416" width="6" height="9" />
            <rect x="1234" y="374" width="6" height="9" /><rect x="1248" y="392" width="6" height="9" />
            <rect x="1234" y="410" width="6" height="9" /><rect x="1570" y="388" width="6" height="9" />
            <rect x="1584" y="406" width="6" height="9" />
          </g>
        </g>

        {/* LEFT FRAME — illuminated GoodsGo billboard */}
        <g>
          <rect x="80" y="286" width="312" height="150" rx="16" fill="#ffcf7a" opacity="0.10" />
          <rect x="150" y="420" width="12" height="150" fill="url(#ggb-steel)" />
          <rect x="300" y="420" width="12" height="150" fill="url(#ggb-steel)" />
          <rect x="96" y="300" width="280" height="120" rx="10" fill="#0a244e" />
          <rect x="96" y="300" width="280" height="120" rx="10" fill="none" stroke="#ffcf7a" strokeWidth="2.5" opacity="0.7" />
          <use href="#ggb-logo" x="152" y="342" />
          <text x="188" y="352" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="32" fill="#ffffff" letterSpacing="0.4">GoodsGo</text>
          <text x="116" y="392" fontFamily="'Barlow',sans-serif" fontWeight="500" fontSize="16" fill="#bcd6f2">Book transport in minutes.</text>
          <rect x="112" y="404" width="248" height="4" rx="2" fill="#ffcf7a" opacity="0.85" />
        </g>

        {/* RIGHT FRAME — glowing GoodsGo Hub building */}
        <g>
          <rect x="1250" y="340" width="300" height="228" fill="#102a52" />
          <rect x="1250" y="340" width="300" height="6" fill="#1a3d70" />
          <rect x="1250" y="352" width="300" height="30" fill="#0a244e" />
          <text x="1400" y="374" textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="19" fill="#ffffff" letterSpacing="0.6">GoodsGo Hub</text>
          <use href="#ggb-logo" x="1274" y="330" style={{ transform: 'scale(0.7)', transformOrigin: '1274px 330px' }} />
          <circle cx="1526" cy="330" r="5" fill="#d31905" style={{ animation: 'ggb-beacon 1.6s ease-in-out infinite' }} />
          <g fill="#ffcf7a" opacity="0.9">
            <rect x="1272" y="398" width="20" height="24" rx="2" />
            <rect x="1306" y="398" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1340" y="398" width="20" height="24" rx="2" />
            <rect x="1374" y="398" width="20" height="24" rx="2" />
            <rect x="1408" y="398" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1442" y="398" width="20" height="24" rx="2" />
            <rect x="1476" y="398" width="20" height="24" rx="2" />
            <rect x="1510" y="398" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1272" y="436" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1306" y="436" width="20" height="24" rx="2" />
            <rect x="1340" y="436" width="20" height="24" rx="2" />
            <rect x="1374" y="436" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1408" y="436" width="20" height="24" rx="2" />
            <rect x="1442" y="436" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1476" y="436" width="20" height="24" rx="2" />
            <rect x="1510" y="436" width="20" height="24" rx="2" />
            <rect x="1272" y="474" width="20" height="24" rx="2" />
            <rect x="1306" y="474" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1340" y="474" width="20" height="24" rx="2" />
            <rect x="1374" y="474" width="20" height="24" rx="2" />
            <rect x="1408" y="474" width="20" height="24" rx="2" />
            <rect x="1442" y="474" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1476" y="474" width="20" height="24" rx="2" opacity="0.4" />
            <rect x="1510" y="474" width="20" height="24" rx="2" />
          </g>
          <rect x="1300" y="520" width="70" height="48" fill="#1a2028" />
          <rect x="1300" y="520" width="70" height="48" fill="#ffcf7a" opacity="0.18" />
        </g>

        {/* Ground field */}
        <rect x="0" y="454" width="1600" height="158" fill="url(#ggb-field)" />
        <g stroke="#3a6b40" strokeWidth="1.6" opacity="0.25">
          <line x1="40" y1="500" x2="360" y2="498" />
          <line x1="1240" y1="500" x2="1560" y2="500" />
        </g>

        {/* Road */}
        <rect x="0" y="606" width="1600" height="8" fill="#12241a" />
        <rect x="0" y="612" width="1600" height="62" fill="url(#ggb-road)" />
        <rect x="0" y="612" width="1600" height="4" fill="#3a4656" />
        <rect x="0" y="670" width="1600" height="6" fill="#0c1016" />
        <rect x="0" y="620" width="1600" height="3" fill="#c9d6e6" opacity="0.35" />
        <rect x="0" y="663" width="1600" height="3" fill="#c9d6e6" opacity="0.35" />
        <g fill="#ffcf7a" opacity="0.75">
          <rect x="120" y="641" width="34" height="5" /><rect x="210" y="641" width="34" height="5" />
          <rect x="300" y="641" width="34" height="5" /><rect x="700" y="641" width="34" height="5" />
          <rect x="790" y="641" width="34" height="5" /><rect x="1180" y="641" width="34" height="5" />
          <rect x="1270" y="641" width="34" height="5" /><rect x="1360" y="641" width="34" height="5" />
          <rect x="1450" y="641" width="34" height="5" />
        </g>

        {/* Street lamps with warm pools */}
        <g stroke="#2b3646" strokeWidth="5" fill="none" strokeLinecap="round">
          <path d="M470,606 L470,510 Q470,502 482,502 L512,502" />
          <path d="M1130,606 L1130,510 Q1130,502 1118,502 L1088,502" />
        </g>
        <ellipse cx="514" cy="506" rx="9" ry="5" fill="#ffcf7a" />
        <ellipse cx="1086" cy="506" rx="9" ry="5" fill="#ffcf7a" />
        <ellipse cx="514" cy="640" rx="120" ry="34" fill="url(#ggb-lamp)" />
        <ellipse cx="1086" cy="640" rx="120" ry="34" fill="url(#ggb-lamp)" />

        {/* Foreground verge */}
        <rect x="0" y="674" width="1600" height="126" fill="url(#ggb-verge)" />

        {/* Red flatbed with amber cargo — bottom-left */}
        <g transform="translate(40,672) scale(0.9)">
          <ellipse cx="150" cy="4" rx="165" ry="10" fill="#000000" opacity="0.28" />
          <rect x="0" y="-46" width="205" height="16" fill="#7a1c12" />
          <rect x="8" y="-124" width="186" height="80" rx="4" fill="#f59e0b" />
          <rect x="8" y="-124" width="186" height="16" rx="4" fill="#ffbf4d" />
          <line x1="70" y1="-124" x2="70" y2="-44" stroke="#c97d06" strokeWidth="3" />
          <line x1="132" y1="-124" x2="132" y2="-44" stroke="#c97d06" strokeWidth="3" />
          <line x1="8" y1="-84" x2="194" y2="-84" stroke="#c97d06" strokeWidth="3" />
          <path d="M205,-30 L205,-116 Q205,-124 214,-124 L250,-124 Q286,-124 292,-84 L296,-30 Z" fill="#d31905" />
          <path d="M224,-116 L250,-116 Q272,-116 276,-86 L230,-86 Q224,-86 224,-92 Z" fill="#9fd0ee" />
          <rect x="205" y="-44" width="92" height="16" fill="#7a1c12" />
          <ellipse cx="330" cy="-40" rx="60" ry="20" fill="#ffcf7a" opacity="0.28" />
          <circle cx="292" cy="-40" r="5" fill="#fff6d0" />
          <rect x="0" y="-30" width="296" height="9" fill="#160a08" />
          <circle cx="4" cy="-40" r="4" fill="#ff4133" />
          <circle cx="52"  cy="-18" r="24" fill="#14171b" /><circle cx="52"  cy="-18" r="10" fill="#6a727d" />
          <circle cx="120" cy="-18" r="24" fill="#14171b" /><circle cx="120" cy="-18" r="10" fill="#6a727d" />
          <circle cx="252" cy="-18" r="24" fill="#14171b" /><circle cx="252" cy="-18" r="10" fill="#6a727d" />
        </g>

        {/* Blue box truck — bottom-right */}
        <g transform="translate(1300,672) scale(0.9)">
          <ellipse cx="130" cy="4" rx="150" ry="11" fill="#000000" opacity="0.28" />
          <rect x="0" y="-134" width="176" height="104" rx="7" fill="#cdd8e5" />
          <rect x="0" y="-134" width="176" height="14" rx="7" fill="#b6c4d4" />
          <rect x="0" y="-74" width="176" height="20" fill="#003082" />
          <line x1="88" y1="-134" x2="88" y2="-30" stroke="#aab8c8" strokeWidth="3" />
          <use href="#ggb-logo" x="46" y="-98" style={{ transform: 'scale(0.6)', transformOrigin: '46px -98px' }} />
          <path d="M176,-30 L176,-104 Q176,-112 184,-112 L232,-112 Q262,-112 262,-78 L262,-30 Z" fill="#003082" />
          <path d="M198,-104 L236,-104 Q248,-104 250,-82 L204,-82 Q198,-82 198,-88 Z" fill="#9fd0ee" />
          <rect x="176" y="-46" width="88" height="16" fill="#0a1f4a" />
          <circle cx="262" cy="-40" r="4" fill="#ff4133" />
          <ellipse cx="-14" cy="-40" rx="56" ry="18" fill="#ffcf7a" opacity="0.26" />
          <circle cx="24" cy="-40" r="5" fill="#fff6d0" />
          <rect x="0" y="-32" width="262" height="10" fill="#141a20" />
          <circle cx="54"  cy="-20" r="23" fill="#14171b" /><circle cx="54"  cy="-20" r="10" fill="#6a727d" />
          <circle cx="212" cy="-20" r="23" fill="#14171b" /><circle cx="212" cy="-20" r="10" fill="#6a727d" />
        </g>

        {/* Foreground trees — dark silhouettes, dense at edges, open centre */}
        <g style={{ color: '#16302a' }}>
          <use href="#ggb-round" transform="translate(360,676) scale(1.05)" />
          <use href="#ggb-pine" transform="translate(-40,690) scale(1.35)" />
        </g>
        <g style={{ color: '#0f231a' }}>
          <use href="#ggb-pine"  transform="translate(-20,800) scale(1.7)" />
          <use href="#ggb-round" transform="translate(120,800) scale(1.2)" />
          <use href="#ggb-pine"  transform="translate(250,808) scale(1.5)" />
          <use href="#ggb-round" transform="translate(370,802) scale(1.1)" />
        </g>
        <g style={{ color: '#0f231a' }}>
          <use href="#ggb-pine"  transform="translate(1210,808) scale(1.4)" />
          <use href="#ggb-round" transform="translate(1330,800) scale(1.25)" />
          <use href="#ggb-pine"  transform="translate(1450,808) scale(1.6)" />
          <use href="#ggb-pine"  transform="translate(1580,802) scale(1.5)" />
        </g>
        <use href="#ggb-palm" transform="translate(24,672) scale(0.9)" />
        <use href="#ggb-palm" transform="translate(1576,668) scale(1.0)" />
        <rect x="0" y="784" width="1600" height="18" fill="#0b1a13" />
      </svg>

      {/* Warm amber halo behind the booking zone — keeps content readable */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(760px,90vw)',
          height: 'min(680px,84vh)',
          transform: 'translate(-50%,-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(255,240,214,0.30) 0%, rgba(255,240,214,0.12) 44%, rgba(255,240,214,0) 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top/bottom scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(6,14,32,0.30) 0%, rgba(6,14,32,0) 26%, rgba(6,14,32,0) 72%, rgba(6,14,32,0.28) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
