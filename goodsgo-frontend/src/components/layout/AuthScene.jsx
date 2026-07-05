import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import GoodsGoLogo from '../common/GoodsGoLogo';

const SKY_GRADIENT =
  'linear-gradient(180deg,#2b7fc6 0%,#59a6de 30%,#9fd0ee 55%,#d7ecf7 72%,#ffe6bd 88%,#ffd69c 100%)';

const SCENE_CSS = `
  @keyframes gg-clouddrift { from { transform: translateX(0); } to { transform: translateX(60px); } }
  @keyframes gg-glow { 0%, 100% { opacity: 0.14; } 50% { opacity: 0.26; } }
  @keyframes gg-fork { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes gg-birds { from { transform: translateX(0); } to { transform: translateX(40px); } }
  @media (prefers-reduced-motion: reduce) {
    .gg-scene-anim { animation: none !important; }
  }
`;

/**
 * Decorative "GoodsGo distribution yard" illustration panel used by the
 * auth split-screen layout. Fills its nearest positioned ancestor and
 * layers: sky gradient → SVG scene → legibility scrim → branding overlay.
 *
 * @param {object} props
 * @param {string} props.title    - Marquee headline shown over the scene.
 * @param {string} props.subtitle - Supporting line under the headline (hidden on small screens).
 */
export default function AuthScene({ title, subtitle }) {
  return (
    <div className="absolute inset-0">
      <style>{SCENE_CSS}</style>

      {/* Sky */}
      <div className="absolute inset-0" style={{ background: SKY_GRADIENT }} />

      {/* Scene */}
      <svg
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 block h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ga-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9ccb5c" />
            <stop offset="1" stopColor="#6ba33a" />
          </linearGradient>
          <linearGradient id="ga-yard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9c1cb" />
            <stop offset="1" stopColor="#8a95a2" />
          </linearGradient>
          <linearGradient id="ga-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f6" />
            <stop offset="1" stopColor="#cdd6df" />
          </linearGradient>
          <linearGradient id="ga-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dff1fb" />
            <stop offset="1" stopColor="#a9d6ee" />
          </linearGradient>
          <g id="ga-pine" fill="currentColor">
            <rect x="26" y="-16" width="9" height="22" fill="#3a2a1f" />
            <polygon points="30,-120 3,-58 57,-58" />
            <polygon points="30,-92 -3,-22 63,-22" />
            <polygon points="30,-64 -9,8 69,8" />
          </g>
          <g id="ga-palm">
            <path d="M-4,4 Q4,-70 -2,-118 Q10,-72 16,4 Z" fill="#2c3d24" />
            <g fill="#264a2e">
              <path d="M6,-116 Q-52,-118 -78,-86 Q-40,-104 6,-104 Z" />
              <path d="M6,-116 Q64,-120 92,-90 Q52,-106 6,-104 Z" />
              <path d="M6,-116 Q-38,-160 -78,-158 Q-30,-140 6,-108 Z" />
              <path d="M6,-116 Q50,-162 90,-158 Q42,-142 6,-108 Z" />
              <path d="M6,-116 Q4,-176 -14,-196 Q10,-152 6,-112 Z" />
            </g>
          </g>
          {/* reusable shipping container (170 x 78), body via currentColor */}
          <g id="ga-cont">
            <rect x="0" y="0" width="170" height="78" rx="3" fill="currentColor" />
            <rect x="0" y="0" width="170" height="9" fill="rgba(255,255,255,0.18)" />
            <rect x="0" y="69" width="170" height="9" fill="rgba(0,0,0,0.22)" />
            <g stroke="rgba(0,0,0,0.16)" strokeWidth="3">
              <line x1="18" y1="10" x2="18" y2="68" />
              <line x1="34" y1="10" x2="34" y2="68" />
              <line x1="50" y1="10" x2="50" y2="68" />
              <line x1="66" y1="10" x2="66" y2="68" />
              <line x1="82" y1="10" x2="82" y2="68" />
              <line x1="98" y1="10" x2="98" y2="68" />
              <line x1="114" y1="10" x2="114" y2="68" />
            </g>
            <rect x="128" y="9" width="42" height="60" fill="rgba(0,0,0,0.10)" />
            <line x1="140" y1="12" x2="140" y2="66" stroke="rgba(0,0,0,0.28)" strokeWidth="3" />
            <line x1="158" y1="12" x2="158" y2="66" stroke="rgba(0,0,0,0.28)" strokeWidth="3" />
            <rect x="6" y="30" width="30" height="18" rx="2" fill="rgba(255,255,255,0.82)" />
            <circle cx="14" cy="39" r="4" fill="#d31905" />
          </g>
        </defs>

        {/* sun */}
        <circle
          cx="1120" cy="360" r="235" fill="#ffb04a" opacity="0.14"
          className="gg-scene-anim"
          style={{ animation: 'gg-glow 7s ease-in-out infinite' }}
        />
        <circle cx="1120" cy="360" r="150" fill="#ffb04a" opacity="0.20" />
        <circle cx="1120" cy="360" r="95" fill="#ffc247" />

        {/* clouds */}
        <g
          className="gg-scene-anim"
          style={{ animation: 'gg-clouddrift 30s ease-in-out infinite alternate' }}
          fill="#ffffff"
          opacity="0.92"
        >
          <ellipse cx="340" cy="140" rx="72" ry="26" />
          <ellipse cx="398" cy="128" rx="56" ry="30" />
          <ellipse cx="286" cy="132" rx="50" ry="23" />
        </g>
        <g
          className="gg-scene-anim"
          style={{ animation: 'gg-clouddrift 42s ease-in-out infinite alternate-reverse' }}
          fill="#ffffff"
          opacity="0.8"
        >
          <ellipse cx="1320" cy="190" rx="62" ry="22" />
          <ellipse cx="1372" cy="181" rx="48" ry="26" />
          <ellipse cx="1276" cy="185" rx="40" ry="19" />
        </g>

        {/* birds */}
        <g
          stroke="#3a4f6a" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round"
          className="gg-scene-anim"
          style={{ animation: 'gg-birds 18s ease-in-out infinite alternate' }}
        >
          <path d="M430,176 q11,-9 22,0 q11,-9 22,0" />
          <path d="M500,156 q9,-7 18,0 q9,-7 18,0" />
          <path d="M460,204 q8,-6 16,0 q8,-6 16,0" />
        </g>

        {/* distant hills */}
        <path d="M-20,470 L200,360 L380,430 L580,326 L780,266 L1000,378 L1220,320 L1440,378 L1620,340 L1620,470 Z" fill="#c6d8ee" />
        <path d="M-20,470 L180,414 L400,450 L600,404 L820,442 L1040,406 L1280,448 L1500,414 L1620,450 L1620,470 Z" fill="#9fb9db" />

        {/* distant city skyline (right) */}
        <g fill="#8aa5cb">
          <rect x="1260" y="420" width="26" height="50" />
          <rect x="1294" y="402" width="30" height="68" />
          <rect x="1332" y="428" width="22" height="42" />
          <rect x="1362" y="392" width="26" height="78" />
          <rect x="1396" y="414" width="34" height="56" />
          <rect x="1438" y="430" width="22" height="40" />
          <rect x="1468" y="406" width="28" height="64" />
          <rect x="1506" y="422" width="24" height="48" />
        </g>

        {/* grass band */}
        <rect x="0" y="452" width="1600" height="112" fill="url(#ga-field)" />
        <g stroke="#5f9433" strokeWidth="1.6" opacity="0.35">
          <line x1="0" y1="500" x2="1600" y2="500" />
          <line x1="0" y1="532" x2="1600" y2="532" />
        </g>

        {/* trees behind the yard */}
        <g style={{ color: '#2b5347' }}>
          <use href="#ga-pine" transform="translate(-30,556) scale(1.2)" />
          <use href="#ga-pine" transform="translate(60,548) scale(0.95)" />
        </g>
        <g style={{ color: '#22463b' }}>
          <use href="#ga-pine" transform="translate(760,556) scale(1.0)" />
          <use href="#ga-pine" transform="translate(840,552) scale(1.15)" />
          <use href="#ga-pine" transform="translate(930,556) scale(0.9)" />
        </g>
        <use href="#ga-palm" transform="translate(1585,548) scale(1.0)" />

        {/* ============ WAREHOUSE ============ */}
        <rect x="150" y="312" width="560" height="248" fill="url(#ga-wall)" />
        <g stroke="#c2cbd4" strokeWidth="2" opacity="0.7">
          <line x1="182" y1="312" x2="182" y2="560" /><line x1="214" y1="312" x2="214" y2="560" />
          <line x1="246" y1="312" x2="246" y2="560" /><line x1="278" y1="312" x2="278" y2="560" />
          <line x1="310" y1="312" x2="310" y2="560" /><line x1="342" y1="312" x2="342" y2="560" />
          <line x1="374" y1="312" x2="374" y2="560" /><line x1="406" y1="312" x2="406" y2="560" />
          <line x1="438" y1="312" x2="438" y2="560" /><line x1="470" y1="312" x2="470" y2="560" />
          <line x1="502" y1="312" x2="502" y2="560" /><line x1="534" y1="312" x2="534" y2="560" />
          <line x1="566" y1="312" x2="566" y2="560" /><line x1="598" y1="312" x2="598" y2="560" />
          <line x1="630" y1="312" x2="630" y2="560" /><line x1="662" y1="312" x2="662" y2="560" />
          <line x1="694" y1="312" x2="694" y2="560" />
        </g>
        {/* sawtooth (north-light) roof: metal slope + glazed clerestory per tooth */}
        <g>
          <polygon points="150,258 150,312 262,312" fill="#6b7787" />
          <rect x="150" y="258" width="16" height="54" fill="url(#ga-glass)" />
          <polygon points="262,258 262,312 374,312" fill="#6b7787" />
          <rect x="262" y="258" width="16" height="54" fill="url(#ga-glass)" />
          <polygon points="374,258 374,312 486,312" fill="#6b7787" />
          <rect x="374" y="258" width="16" height="54" fill="url(#ga-glass)" />
          <polygon points="486,258 486,312 598,312" fill="#6b7787" />
          <rect x="486" y="258" width="16" height="54" fill="url(#ga-glass)" />
          <polygon points="598,258 598,312 710,312" fill="#6b7787" />
          <rect x="598" y="258" width="16" height="54" fill="url(#ga-glass)" />
          <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
            <line x1="155" y1="262" x2="155" y2="308" /><line x1="161" y1="262" x2="161" y2="308" />
            <line x1="267" y1="262" x2="267" y2="308" /><line x1="273" y1="262" x2="273" y2="308" />
            <line x1="379" y1="262" x2="379" y2="308" /><line x1="385" y1="262" x2="385" y2="308" />
            <line x1="491" y1="262" x2="491" y2="308" /><line x1="497" y1="262" x2="497" y2="308" />
            <line x1="603" y1="262" x2="603" y2="308" /><line x1="609" y1="262" x2="609" y2="308" />
          </g>
          <rect x="150" y="308" width="560" height="6" fill="#4b5666" />
        </g>
        {/* signage band */}
        <rect x="150" y="336" width="560" height="46" fill="#003082" />
        <rect x="150" y="336" width="560" height="6" fill="#0a3f9c" />
        <circle cx="256" cy="359" r="13" fill="#d31905" />
        <path d="M249,359 L261,359 M256,352 L263,359 L256,366" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="290" y="370" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="32" fill="#ffffff" letterSpacing="0.5">
          GoodsGo Hub
        </text>
        {/* roller doors */}
        <g>
          {/* left door: OPEN, dark interior with stacked boxes */}
          <rect x="180" y="410" width="120" height="150" fill="#2c333d" />
          <rect x="180" y="404" width="120" height="10" fill="#8892a0" />
          <rect x="196" y="500" width="40" height="60" fill="#c9922f" />
          <rect x="196" y="500" width="40" height="9" fill="#e6b45a" />
          <rect x="242" y="516" width="44" height="44" fill="#b7472f" />
          <rect x="242" y="516" width="44" height="8" fill="#d46a4f" />
          <rect x="206" y="460" width="38" height="40" fill="#2f6fb0" />
          <rect x="206" y="460" width="38" height="8" fill="#4f8fce" />
          {/* middle & right doors: CLOSED shutters */}
          <rect x="350" y="410" width="120" height="150" fill="#aeb7c2" />
          <rect x="350" y="404" width="120" height="10" fill="#8892a0" />
          <g stroke="#93a0ad" strokeWidth="2">
            <line x1="350" y1="424" x2="470" y2="424" /><line x1="350" y1="440" x2="470" y2="440" />
            <line x1="350" y1="456" x2="470" y2="456" /><line x1="350" y1="472" x2="470" y2="472" />
            <line x1="350" y1="488" x2="470" y2="488" /><line x1="350" y1="504" x2="470" y2="504" />
            <line x1="350" y1="520" x2="470" y2="520" /><line x1="350" y1="536" x2="470" y2="536" />
            <line x1="350" y1="552" x2="470" y2="552" />
          </g>
          <rect x="520" y="410" width="120" height="150" fill="#aeb7c2" />
          <rect x="520" y="404" width="120" height="10" fill="#8892a0" />
          <g stroke="#93a0ad" strokeWidth="2">
            <line x1="520" y1="424" x2="640" y2="424" /><line x1="520" y1="440" x2="640" y2="440" />
            <line x1="520" y1="456" x2="640" y2="456" /><line x1="520" y1="472" x2="640" y2="472" />
            <line x1="520" y1="488" x2="640" y2="488" /><line x1="520" y1="504" x2="640" y2="504" />
            <line x1="520" y1="520" x2="640" y2="520" /><line x1="520" y1="536" x2="640" y2="536" />
            <line x1="520" y1="552" x2="640" y2="552" />
          </g>
          {/* dock number plates */}
          <rect x="398" y="392" width="24" height="16" rx="2" fill="#f4f7fa" />
          <text x="410" y="405" textAnchor="middle" fontFamily="'Barlow',sans-serif" fontWeight="700" fontSize="12" fill="#003082">02</text>
          <rect x="568" y="392" width="24" height="16" rx="2" fill="#f4f7fa" />
          <text x="580" y="405" textAnchor="middle" fontFamily="'Barlow',sans-serif" fontWeight="700" fontSize="12" fill="#003082">03</text>
        </g>

        {/* ============ PAVED YARD ============ */}
        <rect x="0" y="560" width="1600" height="240" fill="url(#ga-yard)" />
        <g stroke="#7c8794" strokeWidth="2" opacity="0.5">
          <line x1="0" y1="620" x2="1600" y2="620" />
          <line x1="0" y1="700" x2="1600" y2="700" />
          <line x1="440" y1="560" x2="360" y2="800" />
          <line x1="1040" y1="560" x2="1120" y2="800" />
        </g>
        {/* bay markings */}
        <g fill="#e9c24a" opacity="0.8">
          <rect x="770" y="596" width="8" height="70" />
          <rect x="1050" y="596" width="8" height="70" />
          <rect x="770" y="596" width="290" height="8" />
        </g>

        {/* ============ PARKED BOX TRUCK (in yard) ============ */}
        <g transform="translate(790,632)">
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

        {/* ============ STACKED CONTAINERS (right) ============ */}
        <g>
          <ellipse cx="1310" cy="672" rx="240" ry="16" fill="#12233a" opacity="0.16" />
          <use href="#ga-cont" x="1150" y="584" style={{ color: '#2f6fb2' }} />
          <use href="#ga-cont" x="1322" y="584" style={{ color: '#e0a018' }} />
          <use href="#ga-cont" x="1236" y="502" style={{ color: '#c0392b' }} />
          <use href="#ga-cont" x="1470" y="590" style={{ color: '#2a8c74' }} />
        </g>

        {/* ============ FORKLIFT (foreground) with lifting pallet ============ */}
        <g transform="translate(470,712)">
          <ellipse cx="52" cy="8" rx="98" ry="11" fill="#12233a" opacity="0.2" />
          {/* mast */}
          <rect x="6" y="-124" width="8" height="122" fill="#556070" />
          <rect x="22" y="-124" width="8" height="122" fill="#556070" />
          {/* lifting pallet + crate (animates up/down) */}
          <g className="gg-scene-anim" style={{ animation: 'gg-fork 3.2s ease-in-out infinite' }}>
            <rect x="-18" y="-14" width="70" height="9" fill="#7a5a22" />
            <rect x="-16" y="-72" width="64" height="58" fill="#c9922f" />
            <rect x="-16" y="-72" width="64" height="11" fill="#e6b45a" />
            <line x1="-16" y1="-43" x2="48" y2="-43" stroke="#8a6a2a" strokeWidth="3" />
            <line x1="16" y1="-72" x2="16" y2="-14" stroke="#8a6a2a" strokeWidth="3" />
            <rect x="-14" y="-8" width="44" height="7" fill="#2a2f36" />
          </g>
          {/* body / counterweight */}
          <rect x="40" y="-66" width="80" height="56" rx="8" fill="#f2a900" />
          <rect x="40" y="-66" width="80" height="12" rx="8" fill="#ffc247" />
          {/* overhead guard */}
          <rect x="46" y="-124" width="6" height="60" fill="#3a4550" />
          <rect x="110" y="-124" width="6" height="60" fill="#3a4550" />
          <rect x="42" y="-130" width="78" height="8" rx="3" fill="#3a4550" />
          <rect x="66" y="-82" width="28" height="18" rx="3" fill="#2a2f36" />
          {/* wheels */}
          <circle cx="6" cy="0" r="17" fill="#22262c" />
          <circle cx="6" cy="0" r="7" fill="#8a929d" />
          <circle cx="84" cy="0" r="26" fill="#22262c" />
          <circle cx="84" cy="0" r="11" fill="#8a929d" />
          <circle cx="84" cy="0" r="4" fill="#cdd3da" />
        </g>

        {/* yard floodlight pole */}
        <g stroke="#48545f" strokeWidth="6" fill="none" strokeLinecap="round">
          <path d="M1070,560 L1070,318 L1120,318" />
        </g>
        <rect x="1112" y="308" width="34" height="16" rx="3" fill="#3a4550" />
        <rect x="1116" y="312" width="26" height="8" fill="#ffe6a6" />
      </svg>

      {/* soft scrim so overlay copy stays legible against the sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,22,44,0.30) 0%, rgba(6,22,44,0.05) 32%, rgba(6,22,44,0) 55%)',
        }}
      />

      {/* branding overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] flex flex-col justify-between"
        style={{ padding: 'clamp(20px, 4vw, 52px)' }}
      >
        <Link to={ROUTES.HOME} className="pointer-events-auto flex w-fit items-center gap-3">
          <GoodsGoLogo size={44} />
          <span
            className="font-bold text-white"
            style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 'clamp(20px, 2.2vw, 26px)',
              letterSpacing: '-0.01em',
              textShadow: '0 2px 14px rgba(6,22,44,0.4)',
            }}
          >
            GoodsGo
          </span>
        </Link>

        <div className="max-w-[26ch]">
          <h2
            className="m-0 mb-2 font-bold text-white sm:mb-3"
            style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 'clamp(22px, 3vw, 40px)',
              lineHeight: 1.08,
              textShadow: '0 2px 18px rgba(6,22,44,0.4)',
              textWrap: 'balance',
            }}
          >
            {title}
          </h2>
          <p
            className="m-0 hidden max-w-[34ch] sm:block sm:mb-5"
            style={{
              fontSize: 'clamp(14px, 1.4vw, 17px)',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.92)',
              textShadow: '0 1px 12px rgba(6,22,44,0.35)',
            }}
          >
            {subtitle}
          </p>
          <div
            className="hidden flex-wrap items-center gap-x-4 gap-y-2 font-semibold sm:flex"
            style={{
              fontSize: 'clamp(12px, 1.2vw, 14px)',
              color: 'rgba(255,255,255,0.9)',
              textShadow: '0 1px 10px rgba(6,22,44,0.35)',
            }}
          >
            <span>50,000+ trips delivered</span>
            <span className="opacity-50">&bull;</span>
            <span>1,200+ cities</span>
            <span className="opacity-50">&bull;</span>
            <span>4.8&#9733; rating</span>
          </div>
        </div>
      </div>
    </div>
  );
}

AuthScene.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
};
