import PropTypes from 'prop-types';

const KEYFRAMES = `
  @keyframes gg-clouddrift { from { transform: translateX(0); } to { transform: translateX(60px); } }
  @keyframes gg-glow { 0%, 100% { opacity: 0.14; } 50% { opacity: 0.26; } }
  @keyframes gg-dash { 0% { opacity: 0.15; transform: translateX(8px); } 100% { opacity: 0.7; transform: translateX(-6px); } }
  @keyframes gg-birds { from { transform: translateX(0); } to { transform: translateX(40px); } }
`;

const PALETTES = {
  golden: {
    sky: 'linear-gradient(180deg,#2b7fc6 0%,#59a6de 30%,#9fd0ee 55%,#d7ecf7 72%,#ffe6bd 88%,#ffd69c 100%)',
    sun: '#ffc247',
    sunglow: '#ffb04a',
  },
  day: {
    sky: 'linear-gradient(180deg,#2586d4 0%,#57a9e6 32%,#9fd3f4 60%,#d3edfb 80%,#eaf6ff 100%)',
    sun: '#fff0bf',
    sunglow: '#ffe89a',
  },
  sunset: {
    sky: 'linear-gradient(180deg,#274d78 0%,#5a6fb0 26%,#a97fb0 48%,#f0996a 72%,#ffbf7e 88%,#ffd9a2 100%)',
    sun: '#ff8a42',
    sunglow: '#ff7a3a',
  },
};

/**
 * Scenic hero background: open highway with GoodsGo vehicles crossing a bridge.
 * Ported from Claude Design "GoodsGo Hero Background.dc.html".
 * The SVG scene is anchored to the bottom of the container and scales to viewport width.
 *
 * @param {object}  props
 * @param {'golden'|'day'|'sunset'} props.palette - Sky/lighting palette. Default 'golden'.
 * @param {boolean} props.animate - Enable CSS animations. Default true.
 */
export default function HeroBackground({ palette = 'golden', animate = true }) {
  const p = PALETTES[palette] ?? PALETTES.golden;
  const play = animate ? 'running' : 'paused';

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Wrapper fills the parent section exactly and clips SVG overflow */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', '--play': play }}>

        {/* Full-bleed sky gradient behind the SVG scene */}
        <div style={{ position: 'absolute', inset: 0, background: p.sky }} />

        {/* SVG scene: anchored at the bottom, scales with viewport width */}
        <svg
          viewBox="0 0 1600 800"
          preserveAspectRatio="xMidYMax meet"
          style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 'auto', display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gg-field" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9ccb5c" />
              <stop offset="1" stopColor="#6ba33a" />
            </linearGradient>
            <linearGradient id="gg-valley" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5f8f3f" />
              <stop offset="1" stopColor="#3c6329" />
            </linearGradient>
            <linearGradient id="gg-river" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8fc7e6" />
              <stop offset="1" stopColor="#5fa6d6" />
            </linearGradient>
            <linearGradient id="gg-deck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4c5a6d" />
              <stop offset="1" stopColor="#333e4d" />
            </linearGradient>
            <g id="gg-pine" fill="currentColor">
              <rect x="26" y="-16" width="9" height="22" fill="#3a2a1f" />
              <polygon points="30,-120 3,-58 57,-58" />
              <polygon points="30,-92 -3,-22 63,-22" />
              <polygon points="30,-64 -9,8 69,8" />
            </g>
            <g id="gg-palm">
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

          {/* Sun */}
          <circle cx="1090" cy="374" r="235" fill={p.sunglow} opacity="0.14"
            style={{ animation: 'gg-glow 7s ease-in-out infinite', animationPlayState: 'var(--play)' }} />
          <circle cx="1090" cy="374" r="150" fill={p.sunglow} opacity="0.20" />
          <circle cx="1090" cy="374" r="95" fill={p.sun} />

          {/* Clouds */}
          <g fill="#ffffff" opacity="0.92"
            style={{ animation: 'gg-clouddrift 30s ease-in-out infinite alternate', animationPlayState: 'var(--play)' }}>
            <ellipse cx="360" cy="150" rx="72" ry="26" />
            <ellipse cx="418" cy="138" rx="56" ry="30" />
            <ellipse cx="306" cy="142" rx="50" ry="23" />
          </g>
          <g fill="#ffffff" opacity="0.8"
            style={{ animation: 'gg-clouddrift 42s ease-in-out infinite alternate-reverse', animationPlayState: 'var(--play)' }}>
            <ellipse cx="1240" cy="205" rx="62" ry="22" />
            <ellipse cx="1292" cy="196" rx="48" ry="26" />
            <ellipse cx="1196" cy="200" rx="40" ry="19" />
          </g>

          {/* Birds */}
          <g stroke="#3a4f6a" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round"
            style={{ animation: 'gg-birds 18s ease-in-out infinite alternate', animationPlayState: 'var(--play)' }}>
            <path d="M470,196 q11,-9 22,0 q11,-9 22,0" />
            <path d="M540,176 q9,-7 18,0 q9,-7 18,0" />
            <path d="M500,224 q8,-6 16,0 q8,-6 16,0" />
          </g>

          {/* Distant mountains */}
          <path d="M-20,455 L200,338 L360,410 L560,300 L760,238 L980,360 L1180,300 L1420,362 L1620,320 L1620,455 Z" fill="#c6d8ee" />
          <polygon points="760,238 718,286 802,286" fill="#eff5fc" />
          <polygon points="560,300 531,338 589,338" fill="#eef4fb" />
          <polygon points="1180,300 1150,340 1210,340" fill="#eef4fb" />
          <path d="M-20,455 L180,394 L380,432 L560,382 L780,422 L1000,386 L1240,430 L1460,394 L1620,432 L1620,455 Z" fill="#9fb9db" />

          {/* Distant city skyline (right) */}
          <g fill="#8aa5cb">
            <rect x="1210" y="408" width="26" height="46" />
            <rect x="1244" y="392" width="30" height="62" />
            <rect x="1282" y="416" width="22" height="38" />
            <rect x="1312" y="384" width="26" height="70" />
            <rect x="1346" y="404" width="34" height="50" />
            <rect x="1388" y="418" width="22" height="36" />
            <rect x="1418" y="398" width="28" height="56" />
            <rect x="1456" y="412" width="24" height="42" />
          </g>

          {/* Small-town buildings (left) */}
          <rect x="70" y="416" width="52" height="40" fill="#e7cfa6" />
          <polygon points="66,416 126,416 96,394" fill="#c15a3b" />
          <rect x="132" y="404" width="44" height="52" fill="#efd9b6" />
          <polygon points="128,404 180,404 154,384" fill="#a8492f" />
          <rect x="186" y="422" width="40" height="34" fill="#e2c79c" />
          <polygon points="182,422 230,422 206,404" fill="#c15a3b" />
          <rect x="236" y="410" width="30" height="46" fill="#f0ddbd" />
          <polygon points="232,410 270,410 251,392" fill="#a8492f" />
          <g fill="#7d603a" opacity="0.7">
            <rect x="84" y="428" width="9" height="12" /><rect x="102" y="428" width="9" height="12" />
            <rect x="146" y="418" width="9" height="12" /><rect x="146" y="438" width="9" height="12" />
            <rect x="198" y="432" width="8" height="11" /><rect x="246" y="424" width="8" height="11" />
          </g>

          {/* Green fields */}
          <rect x="0" y="452" width="1600" height="140" fill="url(#gg-field)" />
          <g opacity="0.9">
            <polygon points="0,470 470,468 350,540 0,548" fill="#7cb342" />
            <polygon points="470,468 980,470 980,540 350,540" fill="#93c552" />
            <polygon points="980,470 1600,468 1600,548 980,540" fill="#79ac3d" />
            <polygon points="0,548 350,540 250,592 0,592" fill="#8cbe4a" />
            <polygon points="350,540 980,540 980,592 250,592" fill="#6ea336" />
            <polygon points="980,540 1600,548 1600,592 980,592" fill="#89bc48" />
          </g>
          <g stroke="#4f7d2c" strokeWidth="2.5" opacity="0.55">
            <line x1="0" y1="508" x2="1600" y2="508" />
            <line x1="0" y1="548" x2="1600" y2="548" />
            <line x1="350" y1="540" x2="290" y2="592" />
            <line x1="980" y1="470" x2="980" y2="592" />
          </g>
          <g stroke="#5f9433" strokeWidth="1.6" opacity="0.4">
            <line x1="40" y1="500" x2="330" y2="496" /><line x1="40" y1="520" x2="320" y2="516" />
            <line x1="1040" y1="500" x2="1560" y2="500" /><line x1="1040" y1="522" x2="1560" y2="522" />
          </g>

          {/* Far river segment */}
          <polygon points="792,452 820,452 862,592 762,592" fill="url(#gg-river)" />
          <polygon points="806,452 812,452 828,592 800,592" fill="#d7eef8" opacity="0.5" />

          {/* Bridge — far guardrail */}
          <rect x="0" y="580" width="1600" height="7" fill="#657790" />
          <g fill="#4d5c72">
            <rect x="60" y="576" width="6" height="12" /><rect x="360" y="576" width="6" height="12" />
            <rect x="1180" y="576" width="6" height="12" /><rect x="1500" y="576" width="6" height="12" />
          </g>

          {/* Bridge — deck slab */}
          <rect x="0" y="587" width="1600" height="41" fill="url(#gg-deck)" />
          <rect x="0" y="587" width="1600" height="4" fill="#5b6a80" />
          <rect x="0" y="624" width="1600" height="6" fill="#28313d" />

          {/* Lane dashes */}
          <g fill="#e9c24a" opacity="0.85">
            <rect x="470" y="605" width="26" height="5" /><rect x="540" y="605" width="26" height="5" />
            <rect x="1010" y="605" width="26" height="5" /><rect x="1080" y="605" width="26" height="5" />
            <rect x="1150" y="605" width="26" height="5" />
          </g>

          {/* Under-deck valley */}
          <rect x="0" y="628" width="1600" height="172" fill="url(#gg-valley)" />
          <polygon points="770,628 858,628 968,800 648,800" fill="url(#gg-river)" />
          <polygon points="806,628 822,628 826,800 800,800" fill="#dbeff8" opacity="0.45" />
          {/* Stone arch */}
          <path d="M486,628 L1114,628 L1114,800 L486,800 Z M582,800 Q582,662 800,650 Q1018,662 1018,800 Z" fillRule="evenodd" fill="#47535f" />
          <path d="M486,628 L1114,628 L1114,636 L486,636 Z" fill="#5a6775" />
          <polygon points="782,650 818,650 812,672 788,672" fill="#5a6775" />
          <g stroke="#3a4550" strokeWidth="3" opacity="0.6">
            <line x1="640" y1="712" x2="612" y2="800" /><line x1="720" y1="668" x2="700" y2="720" />
            <line x1="960" y1="712" x2="988" y2="800" /><line x1="880" y1="668" x2="900" y2="720" />
          </g>
          {/* Side piers */}
          <g fill="#3d4a57">
            <rect x="150" y="628" width="24" height="150" /><rect x="330" y="628" width="24" height="150" />
            <rect x="1266" y="628" width="24" height="150" /><rect x="1446" y="628" width="24" height="150" />
          </g>
          <g fill="#4a5866">
            <rect x="146" y="628" width="32" height="8" /><rect x="326" y="628" width="32" height="8" />
            <rect x="1262" y="628" width="32" height="8" /><rect x="1442" y="628" width="32" height="8" />
          </g>

          {/* Foreground trees */}
          <g style={{ color: '#2b5347' }}>
            <use href="#gg-pine" transform="translate(-30,760) scale(1.5)" />
            <use href="#gg-pine" transform="translate(70,742) scale(1.2)" />
            <use href="#gg-pine" transform="translate(150,772) scale(1.4)" />
          </g>
          <g style={{ color: '#22463b' }}>
            <use href="#gg-pine" transform="translate(0,800) scale(1.7)" />
            <use href="#gg-pine" transform="translate(120,806) scale(1.5)" />
            <use href="#gg-pine" transform="translate(240,800) scale(1.6)" />
            <use href="#gg-pine" transform="translate(360,808) scale(1.4)" />
            <use href="#gg-pine" transform="translate(470,804) scale(1.5)" />
            <use href="#gg-pine" transform="translate(560,810) scale(1.2)" />
          </g>
          <g style={{ color: '#22463b' }}>
            <use href="#gg-pine" transform="translate(1000,808) scale(1.3)" />
            <use href="#gg-pine" transform="translate(1100,802) scale(1.6)" />
            <use href="#gg-pine" transform="translate(1220,810) scale(1.5)" />
            <use href="#gg-pine" transform="translate(1340,804) scale(1.7)" />
            <use href="#gg-pine" transform="translate(1470,808) scale(1.5)" />
            <use href="#gg-pine" transform="translate(1560,802) scale(1.4)" />
          </g>
          <g style={{ color: '#2b5347' }}>
            <use href="#gg-pine" transform="translate(1430,746) scale(1.25)" />
            <use href="#gg-pine" transform="translate(1540,760) scale(1.5)" />
          </g>
          <use href="#gg-palm" transform="translate(1596,742) scale(1.15)" />
          <use href="#gg-palm" transform="translate(24,738) scale(1.0)" />
          <rect x="0" y="782" width="1600" height="18" fill="#1c3a31" />

          {/* Street lamps */}
          <g stroke="#48545f" strokeWidth="5" fill="none" strokeLinecap="round">
            <path d="M472,582 L472,486 Q472,478 484,478 L512,478" />
            <path d="M1052,582 L1052,486 Q1052,478 1040,478 L1012,478" />
          </g>
          <ellipse cx="514" cy="482" rx="9" ry="5" fill="#ffd257" />
          <ellipse cx="1010" cy="482" rx="9" ry="5" fill="#ffd257" />

          {/* Milestone post */}
          <rect x="94" y="560" width="14" height="24" rx="3" fill="#f4f7fa" />
          <rect x="94" y="560" width="14" height="9" rx="3" fill="#d31905" />

          {/* Blue box truck */}
          <g transform="translate(150,587)">
            <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.55"
              style={{ animation: 'gg-dash .9s ease-in-out infinite alternate', animationPlayState: 'var(--play)' }}>
              <line x1="-46" y1="-104" x2="-14" y2="-104" />
              <line x1="-54" y1="-80" x2="-16" y2="-80" />
              <line x1="-44" y1="-56" x2="-12" y2="-56" />
            </g>
            <ellipse cx="130" cy="3" rx="140" ry="9" fill="#12233a" opacity="0.18" />
            <rect x="0" y="-134" width="176" height="104" rx="7" fill="#eef3f8" />
            <rect x="0" y="-134" width="176" height="14" rx="7" fill="#dbe6f1" />
            <rect x="0" y="-74" width="176" height="20" fill="#003082" />
            <line x1="132" y1="-134" x2="132" y2="-30" stroke="#cdd8e5" strokeWidth="3" />
            <circle cx="34" cy="-98" r="13" fill="#d31905" />
            <path d="M28,-98 L38,-98 M34,-104 L40,-98 L34,-92" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M176,-30 L176,-104 Q176,-112 184,-112 L232,-112 Q262,-112 262,-78 L262,-30 Z" fill="#003082" />
            <path d="M198,-104 L236,-104 Q248,-104 250,-82 L204,-82 Q198,-82 198,-88 Z" fill="#bfe3f2" />
            <rect x="176" y="-46" width="88" height="16" fill="#0a1f4a" />
            <circle cx="256" cy="-40" r="5" fill="#ffd257" />
            <rect x="0" y="-32" width="262" height="10" fill="#26313f" />
            <circle cx="54" cy="-20" r="23" fill="#22262c" /><circle cx="54" cy="-20" r="10" fill="#7a8592" /><circle cx="54" cy="-20" r="4" fill="#c7ced6" />
            <circle cx="212" cy="-20" r="23" fill="#22262c" /><circle cx="212" cy="-20" r="10" fill="#7a8592" /><circle cx="212" cy="-20" r="4" fill="#c7ced6" />
          </g>

          {/* Red flatbed hero truck with amber cargo */}
          <g transform="translate(680,587) scale(1.1)">
            <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.6"
              style={{ animation: 'gg-dash .8s ease-in-out infinite alternate', animationPlayState: 'var(--play)' }}>
              <line x1="-52" y1="-118" x2="-16" y2="-118" />
              <line x1="-60" y1="-92" x2="-18" y2="-92" />
              <line x1="-50" y1="-66" x2="-14" y2="-66" />
            </g>
            <ellipse cx="150" cy="3" rx="165" ry="10" fill="#12233a" opacity="0.18" />
            <rect x="0" y="-46" width="205" height="16" fill="#7a1c12" />
            <rect x="8" y="-124" width="186" height="80" rx="4" fill="#f59e0b" />
            <rect x="8" y="-124" width="186" height="16" rx="4" fill="#ffbf4d" />
            <line x1="70" y1="-124" x2="70" y2="-44" stroke="#c97d06" strokeWidth="3" />
            <line x1="132" y1="-124" x2="132" y2="-44" stroke="#c97d06" strokeWidth="3" />
            <line x1="8" y1="-84" x2="194" y2="-84" stroke="#c97d06" strokeWidth="3" />
            <rect x="40" y="-126" width="6" height="84" fill="#5b4a2a" opacity="0.5" />
            <rect x="156" y="-126" width="6" height="84" fill="#5b4a2a" opacity="0.5" />
            <path d="M205,-30 L205,-116 Q205,-124 214,-124 L250,-124 Q286,-124 292,-84 L296,-30 Z" fill="#d31905" />
            <path d="M224,-116 L250,-116 Q272,-116 276,-86 L230,-86 Q224,-86 224,-92 Z" fill="#bfe3f2" />
            <rect x="205" y="-44" width="92" height="16" fill="#7a1c12" />
            <circle cx="290" cy="-38" r="5" fill="#fff0b0" />
            <circle cx="250" cy="-96" r="11" fill="#fff" />
            <path d="M245,-96 L255,-96 M250,-101 L256,-96 L250,-91" stroke="#d31905" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="0" y="-30" width="296" height="9" fill="#2a1410" />
            <circle cx="52" cy="-18" r="24" fill="#22262c" /><circle cx="52" cy="-18" r="10" fill="#8a929d" /><circle cx="52" cy="-18" r="4" fill="#cdd3da" />
            <circle cx="120" cy="-18" r="24" fill="#22262c" /><circle cx="120" cy="-18" r="10" fill="#8a929d" /><circle cx="120" cy="-18" r="4" fill="#cdd3da" />
            <circle cx="252" cy="-18" r="24" fill="#22262c" /><circle cx="252" cy="-18" r="10" fill="#8a929d" /><circle cx="252" cy="-18" r="4" fill="#cdd3da" />
          </g>

          {/* Indian goods three-wheeler (tempo) */}
          <g transform="translate(1210,589) scale(0.95)">
            <g stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5"
              style={{ animation: 'gg-dash 1s ease-in-out infinite alternate', animationPlayState: 'var(--play)' }}>
              <line x1="-40" y1="-78" x2="-12" y2="-78" />
              <line x1="-46" y1="-58" x2="-14" y2="-58" />
            </g>
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
            <circle cx="150" cy="-16" r="18" fill="#22262c" /><circle cx="150" cy="-16" r="7" fill="#8a929d" />
            <circle cx="46" cy="-16" r="18" fill="#22262c" /><circle cx="46" cy="-16" r="7" fill="#8a929d" />
          </g>
        </svg>
      </div>
    </>
  );
}

HeroBackground.propTypes = {
  palette: PropTypes.oneOf(['golden', 'day', 'sunset']),
  animate: PropTypes.bool,
};
