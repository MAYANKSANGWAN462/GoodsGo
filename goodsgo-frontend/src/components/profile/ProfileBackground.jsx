export default function ProfileBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <style>{`
        @keyframes ggf-twinkle    { 0%, 100% { opacity: .25 } 50% { opacity: .9 } }
        @keyframes ggf-glow       { 0%, 100% { opacity: .12 } 50% { opacity: .22 } }
        @keyframes ggf-bulb       { 0%, 100% { opacity: .55 } 50% { opacity: 1 } }
        @keyframes ggf-clouddrift { from { transform: translateX(0) } to { transform: translateX(40px) } }
        @keyframes ggf-pennant    { 0%, 100% { transform: skewX(0deg) } 50% { transform: skewX(-6deg) } }
      `}</style>

      {/* Twilight sky gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,#0d1330 0%,#161d44 28%,#242a63 50%,#3a3a72 70%,#5a3f68 87%,#7a4a5e 100%)',
        }}
      />

      {/* Scene SVG — a partner's home bay: milestone honour-wall + a parked truck under a
          warm-lit canopy, string lights overhead, dark calm centre for the profile content */}
      <svg
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id="ggf-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#243a2c" />
            <stop offset="1" stopColor="#132419" />
          </linearGradient>
          <linearGradient id="ggf-apron" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a3054" />
            <stop offset="1" stopColor="#181c38" />
          </linearGradient>
          <linearGradient id="ggf-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c2450" />
            <stop offset="1" stopColor="#141a3a" />
          </linearGradient>
          <linearGradient id="ggf-canopy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a3f9c" />
            <stop offset="1" stopColor="#002a72" />
          </linearGradient>
          <linearGradient id="ggf-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a4460" />
            <stop offset="1" stopColor="#232a44" />
          </linearGradient>
          <radialGradient id="ggf-pool" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.42" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
          <g id="ggf-pine" fill="currentColor">
            <rect x="26" y="-16" width="9" height="22" fill="#0f1f16" />
            <polygon points="30,-120 3,-58 57,-58" />
            <polygon points="30,-92 -3,-22 63,-22" />
            <polygon points="30,-64 -9,8 69,8" />
          </g>
          <g id="ggf-round" fill="currentColor">
            <rect x="-4" y="-14" width="8" height="26" fill="#0f1f16" />
            <circle cx="0" cy="-44" r="34" />
            <circle cx="-24" cy="-28" r="24" />
            <circle cx="24" cy="-28" r="24" />
            <circle cx="0" cy="-20" r="26" />
          </g>
          <g id="ggf-palm">
            <path d="M-4,4 Q4,-70 -2,-118 Q10,-72 16,4 Z" fill="#0f1f16" />
            <g fill="#102019">
              <path d="M6,-116 Q-52,-118 -78,-86 Q-40,-104 6,-104 Z" />
              <path d="M6,-116 Q64,-120 92,-90 Q52,-106 6,-104 Z" />
              <path d="M6,-116 Q-38,-160 -78,-158 Q-30,-140 6,-108 Z" />
              <path d="M6,-116 Q50,-162 90,-158 Q42,-142 6,-108 Z" />
              <path d="M6,-116 Q4,-176 -14,-196 Q10,-152 6,-112 Z" />
            </g>
          </g>
          {/* GoodsGo roundel logo — red disc + white forward arrow */}
          <g id="ggf-logo">
            <circle cx="0" cy="0" r="22" fill="#d31905" />
            <path d="M-9,0 L9,0 M1,-9 L11,0 L1,9" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g id="ggf-star" fill="#ffce4d">
            <path d="M0,-13 L3.8,-4 L13,-4 L5.5,2.2 L8.4,11 L0,5.4 L-8.4,11 L-5.5,2.2 L-13,-4 L-3.8,-4 Z" />
          </g>
        </defs>

        {/* Stars toward the top corners */}
        <g fill="#ffffff">
          <circle cx="130"  cy="66"  r="2"   opacity="0.8"  style={{ animation: 'ggf-twinkle 3.2s ease-in-out infinite' }} />
          <circle cx="250"  cy="118" r="1.6" opacity="0.6"  style={{ animation: 'ggf-twinkle 4s ease-in-out .5s infinite' }} />
          <circle cx="420"  cy="58"  r="1.8" opacity="0.7"  style={{ animation: 'ggf-twinkle 3.6s ease-in-out .9s infinite' }} />
          <circle cx="760"  cy="52"  r="1.6" opacity="0.6"  style={{ animation: 'ggf-twinkle 3.8s ease-in-out 1.1s infinite' }} />
          <circle cx="1120" cy="66"  r="1.8" opacity="0.7"  style={{ animation: 'ggf-twinkle 3.4s ease-in-out .2s infinite' }} />
          <circle cx="1250" cy="112" r="1.5" opacity="0.55" style={{ animation: 'ggf-twinkle 4s ease-in-out 1s infinite' }} />
          <circle cx="1500" cy="70"  r="2"   opacity="0.8"  style={{ animation: 'ggf-twinkle 3.6s ease-in-out .4s infinite' }} />
        </g>

        {/* Moon — upper-left corner */}
        <circle cx="230" cy="176" r="150" fill="#c9c6e0" opacity="0.10" style={{ animation: 'ggf-glow 8s ease-in-out infinite' }} />
        <circle cx="230" cy="176" r="86" fill="#c9c6e0" opacity="0.15" />
        <circle cx="230" cy="176" r="60" fill="#e8e6f0" />
        <g fill="#242a63" opacity="0.12">
          <circle cx="214" cy="162" r="11" />
          <circle cx="248" cy="190" r="8" />
          <circle cx="228" cy="198" r="5" />
        </g>

        {/* Thin drifting cloud */}
        <g style={{ animation: 'ggf-clouddrift 46s ease-in-out infinite alternate' }} fill="#2e355e" opacity="0.5">
          <ellipse cx="940" cy="150" rx="76" ry="15" />
          <ellipse cx="1010" cy="158" rx="56" ry="11" />
        </g>

        {/* String lights strung across the top */}
        <path d="M40,122 Q800,250 1560,122" stroke="#3a3f5e" strokeWidth="2.5" fill="none" />
        <g>
          <g style={{ animation: 'ggf-bulb 2.8s ease-in-out infinite' }}><line x1="120" y1="132" x2="120" y2="140" stroke="#3a3f5e" strokeWidth="2" /><circle cx="120" cy="145" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 3.2s ease-in-out .3s infinite' }}><line x1="260" y1="152" x2="260" y2="160" stroke="#3a3f5e" strokeWidth="2" /><circle cx="260" cy="165" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 2.6s ease-in-out .6s infinite' }}><line x1="400" y1="168" x2="400" y2="176" stroke="#3a3f5e" strokeWidth="2" /><circle cx="400" cy="181" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 3s ease-in-out .9s infinite' }}><line x1="560" y1="182" x2="560" y2="190" stroke="#3a3f5e" strokeWidth="2" /><circle cx="560" cy="195" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 2.9s ease-in-out .4s infinite' }}><line x1="720" y1="190" x2="720" y2="198" stroke="#3a3f5e" strokeWidth="2" /><circle cx="720" cy="203" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 3.1s ease-in-out .7s infinite' }}><line x1="880" y1="190" x2="880" y2="198" stroke="#3a3f5e" strokeWidth="2" /><circle cx="880" cy="203" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 2.7s ease-in-out 1s infinite' }}><line x1="1040" y1="182" x2="1040" y2="190" stroke="#3a3f5e" strokeWidth="2" /><circle cx="1040" cy="195" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 3.3s ease-in-out .2s infinite' }}><line x1="1200" y1="168" x2="1200" y2="176" stroke="#3a3f5e" strokeWidth="2" /><circle cx="1200" cy="181" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 2.8s ease-in-out .5s infinite' }}><line x1="1340" y1="152" x2="1340" y2="160" stroke="#3a3f5e" strokeWidth="2" /><circle cx="1340" cy="165" r="5" fill="#ffcf7a" /></g>
          <g style={{ animation: 'ggf-bulb 3s ease-in-out .8s infinite' }}><line x1="1480" y1="132" x2="1480" y2="140" stroke="#3a3f5e" strokeWidth="2" /><circle cx="1480" cy="145" r="5" fill="#ffcf7a" /></g>
        </g>

        {/* Distant hills (low, dark) */}
        <path d="M-20,472 L220,392 L440,452 L680,388 L920,462 L1160,398 L1400,456 L1620,398 L1620,472 Z" fill="#2e355e" />

        {/* LEFT FRAME — milestone honour-wall */}
        <g>
          <rect x="60" y="296" width="322" height="182" rx="10" fill="url(#ggf-wall)" />
          <rect x="60" y="296" width="322" height="182" rx="10" fill="none" stroke="#ffcf7a" strokeWidth="2" opacity="0.55" />
          <rect x="60" y="296" width="322" height="30" fill="#0a244e" />
          <use href="#ggf-logo" x="86" y="311" style={{ transform: 'scale(0.5)', transformOrigin: '86px 311px' }} />
          <text x="102" y="317" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="16" fill="#ffffff" letterSpacing="0.4">Milestones</text>
          {/* medallions */}
          <g>
            <circle cx="132" cy="374" r="32" fill="#12224a" stroke="#ffcf7a" strokeWidth="2.5" />
            <use href="#ggf-star" transform="translate(132,370) scale(1.15)" />
            <text x="132" y="393" textAnchor="middle" fontFamily="'Barlow',sans-serif" fontWeight="700" fontSize="10" fill="#ffce4d">5.0</text>
            <circle cx="228" cy="374" r="32" fill="#12224a" stroke="#ffcf7a" strokeWidth="2.5" />
            <text x="228" y="370" textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="16" fill="#ffffff">512</text>
            <text x="228" y="386" textAnchor="middle" fontFamily="'Barlow',sans-serif" fontWeight="600" fontSize="9" fill="#bcd6f2">TRIPS</text>
            <circle cx="324" cy="374" r="32" fill="#12224a" stroke="#ffcf7a" strokeWidth="2.5" />
            <text x="324" y="370" textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="15" fill="#ffffff">98%</text>
            <text x="324" y="386" textAnchor="middle" fontFamily="'Barlow',sans-serif" fontWeight="600" fontSize="9" fill="#bcd6f2">ON-TIME</text>
          </g>
          {/* pennant garland below */}
          <g style={{ animation: 'ggf-pennant 4s ease-in-out infinite', transformOrigin: '220px 424px' }}>
            <path d="M92,424 L120,424 L106,442 Z" fill="#d31905" />
            <path d="M132,424 L160,424 L146,442 Z" fill="#f5b60a" />
            <path d="M172,424 L200,424 L186,442 Z" fill="#2a8c74" />
            <path d="M212,424 L240,424 L226,442 Z" fill="#0d68b1" />
            <path d="M252,424 L280,424 L266,442 Z" fill="#d31905" />
            <path d="M292,424 L320,424 L306,442 Z" fill="#f5b60a" />
            <line x1="88" y1="424" x2="352" y2="424" stroke="#3a3f5e" strokeWidth="2" />
          </g>
        </g>

        {/* RIGHT FRAME — parked truck under a warm-lit home canopy */}
        <g>
          <ellipse cx="1420" cy="640" rx="200" ry="46" fill="url(#ggf-pool)" />
          <rect x="1300" y="336" width="14" height="150" fill="url(#ggf-steel)" />
          <rect x="1540" y="336" width="14" height="150" fill="url(#ggf-steel)" />
          <rect x="1276" y="316" width="296" height="30" rx="5" fill="url(#ggf-canopy)" />
          <rect x="1276" y="316" width="296" height="7" rx="5" fill="#1a56c4" />
          <use href="#ggf-logo" x="1300" y="331" style={{ transform: 'scale(0.5)', transformOrigin: '1300px 331px' }} />
          <text x="1440" y="337" textAnchor="middle" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="16" fill="#ffffff" letterSpacing="0.4">My Bay &middot; MH-12 AB 3456</text>
          <rect x="1288" y="346" width="272" height="10" fill="#ffcf7a" opacity="0.16" />
          {/* parked blue box truck, warmly lit */}
          <g transform="translate(1300,606) scale(0.92)">
            <ellipse cx="130" cy="4" rx="150" ry="11" fill="#000000" opacity="0.3" />
            <rect x="0" y="-134" width="176" height="104" rx="7" fill="#dfe8f2" />
            <rect x="0" y="-134" width="176" height="14" rx="7" fill="#c4d2e2" />
            <rect x="0" y="-74" width="176" height="20" fill="#003082" />
            <line x1="88" y1="-134" x2="88" y2="-30" stroke="#b6c4d4" strokeWidth="3" />
            <use href="#ggf-logo" x="46" y="-98" style={{ transform: 'scale(0.6)', transformOrigin: '46px -98px' }} />
            <path d="M176,-30 L176,-104 Q176,-112 184,-112 L232,-112 Q262,-112 262,-78 L262,-30 Z" fill="#003082" />
            <path d="M198,-104 L236,-104 Q248,-104 250,-82 L204,-82 Q198,-82 198,-88 Z" fill="#9fd0ee" />
            <rect x="176" y="-46" width="88" height="16" fill="#0a1f4a" />
            <rect x="0" y="-32" width="262" height="10" fill="#141a20" />
            <circle cx="54" cy="-20" r="23" fill="#14171b" /><circle cx="54" cy="-20" r="10" fill="#6a727d" />
            <circle cx="212" cy="-20" r="23" fill="#14171b" /><circle cx="212" cy="-20" r="10" fill="#6a727d" />
          </g>
        </g>

        {/* Ground field band */}
        <rect x="0" y="454" width="1600" height="158" fill="url(#ggf-field)" />
        <g stroke="#2f5b39" strokeWidth="1.6" opacity="0.25">
          <line x1="40" y1="500" x2="360" y2="498" />
          <line x1="1240" y1="500" x2="1560" y2="498" />
        </g>

        {/* Apron (full width, centre kept open) */}
        <rect x="0" y="600" width="1600" height="200" fill="url(#ggf-apron)" />
        <rect x="0" y="600" width="1600" height="5" fill="#333a63" />

        {/* Foreground — potted plant + crate on the left corner */}
        <g transform="translate(120,712)">
          <ellipse cx="30" cy="46" rx="70" ry="11" fill="#000000" opacity="0.22" />
          <path d="M-6,10 L46,10 L40,52 L0,52 Z" fill="#7a4a2c" />
          <path d="M-6,10 L46,10 L44,22 L-4,22 Z" fill="#8f5a36" />
          <g fill="#1f4a34">
            <ellipse cx="20" cy="-14" rx="30" ry="34" />
            <ellipse cx="4" cy="0" rx="22" ry="26" />
            <ellipse cx="38" cy="-2" rx="20" ry="24" />
          </g>
          <rect x="70" y="0" width="52" height="50" rx="3" fill="#3a4460" />
          <rect x="70" y="0" width="52" height="10" fill="#48547a" />
        </g>
        {/* Foreground — stacked crates right corner */}
        <g transform="translate(1360,714)">
          <ellipse cx="70" cy="46" rx="120" ry="12" fill="#000000" opacity="0.22" />
          <rect x="8" y="-6" width="60" height="52" rx="3" fill="#3a4460" />
          <rect x="8" y="-6" width="60" height="10" fill="#48547a" />
          <rect x="74" y="2" width="52" height="44" rx="3" fill="#333c5a" />
          <rect x="74" y="2" width="52" height="9" fill="#434e72" />
          <rect x="34" y="-56" width="52" height="50" rx="3" fill="#40496c" />
          <rect x="34" y="-56" width="52" height="9" fill="#4d5980" />
          <use href="#ggf-logo" x="60" y="-30" style={{ transform: 'scale(0.42)', transformOrigin: '60px -30px' }} />
        </g>

        {/* Framing trees — dark silhouettes at the edges, open centre */}
        <g style={{ color: '#0f231a' }}>
          <use href="#ggf-pine" transform="translate(-40,690) scale(1.4)" />
          <use href="#ggf-round" transform="translate(1520,678) scale(1.05)" />
        </g>
        <g style={{ color: '#0b1a13' }}>
          <use href="#ggf-pine" transform="translate(-24,800) scale(1.7)" />
          <use href="#ggf-round" transform="translate(120,802) scale(1.15)" />
        </g>
        <g style={{ color: '#0b1a13' }}>
          <use href="#ggf-pine" transform="translate(1470,806) scale(1.6)" />
          <use href="#ggf-pine" transform="translate(1585,800) scale(1.5)" />
        </g>
        <use href="#ggf-palm" transform="translate(20,672) scale(0.92)" />
        <use href="#ggf-palm" transform="translate(1578,668) scale(1.0)" />
        <rect x="0" y="786" width="1600" height="16" fill="#08150f" />
      </svg>

      {/* Soft warm halo behind the profile zone so content sits on calm, even light */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(720px,88vw)',
          height: 'min(660px,84vh)',
          transform: 'translate(-50%,-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(255,244,224,0.34) 0%, rgba(255,244,224,0.14) 44%, rgba(255,244,224,0) 72%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top/bottom scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(8,12,34,0.34) 0%, rgba(8,12,34,0) 26%, rgba(8,12,34,0) 72%, rgba(8,12,34,0.30) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
