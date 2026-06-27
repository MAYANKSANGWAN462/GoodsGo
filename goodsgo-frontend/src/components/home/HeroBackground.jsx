import PropTypes from 'prop-types';

const KEYFRAMES = `
  @keyframes ggHaze { 0%,100% { opacity: .55; } 50% { opacity: .75; } }
`;

/**
 * Scenic hero background illustration: golden-hour landscape with GoodsGo-branded trucks.
 * Ported 1-to-1 from the Claude Design file "Goods Go Hero Background.dc.html".
 *
 * @param {object} props
 * @param {2|3}    props.truckCount  - Show 2 or 3 trucks. Default 2.
 * @param {string} props.accent      - Primary brand accent colour for the lead truck. Default '#f2b53d'.
 * @param {boolean} props.showHeadline - Render the headline overlay. Default false.
 * @param {string} props.headline    - Headline text when showHeadline is true.
 * @param {string} props.subhead     - Subheading text when showHeadline is true.
 */
export default function HeroBackground({
  truckCount = 3,
  accent = '#f2b53d',
  showHeadline = false,
  headline = 'Moving India forward',
  subhead = 'Reliable logistics, on every road.',
}) {
  const accentDark = '#e0a02c';
  const accent3 = '#cf6a4a';
  const showThird = truckCount >= 3;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: '480px',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, #a9c4ce 0%, #c4cdbf 34%, #ecd4a4 60%, #f7e3ad 78%, #fbeec8 100%)',
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {/* ── SUN GLOW ───────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: '60%',
            top: '30%',
            width: '46%',
            height: '60%',
            transform: 'translate(-50%, -30%)',
            background:
              'radial-gradient(circle at center, rgba(255,214,130,0.95) 0%, rgba(255,210,120,0.45) 28%, rgba(255,224,160,0.18) 50%, rgba(255,224,160,0) 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* sun disc */}
        <div
          style={{
            position: 'absolute',
            left: '60%',
            top: '46%',
            width: '230px',
            height: '230px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, #ffe7a6 0%, #ffd574 55%, #ffc85a 100%)',
            boxShadow: '0 0 90px 30px rgba(255,206,110,0.55)',
          }}
        />

        {/* ── FAR HILL RANGE ─────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: '-16%',
            top: '40%',
            width: '80%',
            height: '44%',
            borderRadius: '50%',
            background: '#eccda0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '30%',
            top: '38%',
            width: '92%',
            height: '50%',
            borderRadius: '50%',
            background: '#e8c79a',
          }}
        />

        {/* ── MID HILL RANGE ─────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: '-22%',
            top: '47%',
            width: '78%',
            height: '42%',
            borderRadius: '50%',
            background: '#d8b282',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '44%',
            top: '46%',
            width: '86%',
            height: '46%',
            borderRadius: '50%',
            background: '#d4ac7a',
          }}
        />

        {/* ── HORIZON HAZE BAND ──────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '56%',
            height: '12%',
            background:
              'linear-gradient(180deg, rgba(255,240,210,0) 0%, rgba(255,238,205,0.7) 45%, rgba(255,236,200,0) 100%)',
            animation: 'ggHaze 9s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* ── NEAR HILLS ─────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: '-20%',
            top: '55%',
            width: '74%',
            height: '36%',
            borderRadius: '50%',
            background: '#c3a857',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '52%',
            top: '54%',
            width: '80%',
            height: '40%',
            borderRadius: '50%',
            background: '#b89e4c',
          }}
        />

        {/* ── GROUND / FIELD ─────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '38%',
            background:
              'linear-gradient(180deg, #b49a44 0%, #a68d3c 30%, #8f7831 100%)',
          }}
        />

        {/* ── ROAD ───────────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '68%',
            height: '13%',
            background:
              'linear-gradient(180deg, #7c7165 0%, #6b6053 45%, #585044 100%)',
          }}
        >
          {/* far shoulder line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '8%',
              height: '2px',
              background: 'rgba(247,236,210,0.5)',
            }}
          />
          {/* dashed centre line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '52%',
              height: '4px',
              background:
                'repeating-linear-gradient(90deg, rgba(248,225,170,0.92) 0 46px, rgba(248,225,170,0) 46px 92px)',
            }}
          />
          {/* near edge */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '6%',
              height: '2px',
              background: 'rgba(40,36,30,0.35)',
            }}
          />
        </div>

        {/* ── TRUCK: BACK (small, far) ───────────────────────── */}
        <div style={{ position: 'absolute', left: '13%', top: '60.5%', width: '15%' }}>
          {/* load shadow stripe */}
          <div
            style={{
              position: 'absolute',
              right: '102%',
              top: '36%',
              width: '60%',
              height: '24%',
              background:
                'repeating-linear-gradient(90deg, rgba(80,72,62,0.35) 0 12px, rgba(80,72,62,0) 12px 22px)',
              borderRadius: '2px',
            }}
          />
          <svg viewBox="0 0 268 150" width="100%" height="auto" style={{ display: 'block' }}>
            <rect x="6" y="34" width="156" height="78" rx="7" fill="#f2f3f1" />
            <rect x="156" y="60" width="68" height="52" rx="8" fill="#eef0ee" />
            <path d="M200 65 h14 q9 0 12 8 l5 17 h-31 z" fill="#bfe1ea" />
            <rect x="6" y="108" width="218" height="7" rx="2" fill="#cfd0cd" />
            <text
              x="84"
              y="86"
              textAnchor="middle"
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight="700"
              fontSize="17"
              letterSpacing="1"
              fill="#5a5147"
            >
              GOODS GO
            </text>
            <circle cx="54" cy="116" r="19" fill="#272727" />
            <circle cx="54" cy="116" r="7.5" fill="#c9cac7" />
            <circle cx="192" cy="116" r="19" fill="#272727" />
            <circle cx="192" cy="116" r="7.5" fill="#c9cac7" />
          </svg>
        </div>

        {/* ── TRUCK: FRONT (large, near) ─────────────────────── */}
        <div style={{ position: 'absolute', left: '38%', top: '64.5%', width: '27%' }}>
          {/* load shadow stripe */}
          <div
            style={{
              position: 'absolute',
              right: '101%',
              top: '40%',
              width: '55%',
              height: '22%',
              background:
                'repeating-linear-gradient(90deg, rgba(60,54,46,0.4) 0 16px, rgba(60,54,46,0) 16px 30px)',
              borderRadius: '2px',
            }}
          />
          <svg
            viewBox="0 0 268 150"
            width="100%"
            height="auto"
            style={{
              display: 'block',
              filter: 'drop-shadow(0 8px 10px rgba(60,48,28,0.22))',
            }}
          >
            <rect x="6" y="30" width="160" height="84" rx="8" fill="#ffffff" />
            <rect x="14" y="36" width="144" height="22" rx="4" fill={accent} />
            <rect x="14" y="36" width="46" height="22" rx="4" fill={accentDark} />
            <rect x="108" y="36" width="50" height="22" rx="4" fill={accentDark} />
            <rect x="156" y="56" width="70" height="58" rx="9" fill="#ffffff" />
            <path d="M202 61 h15 q9 0 12 9 l5 19 h-32 z" fill="#bfe1ea" />
            <rect x="6" y="110" width="224" height="8" rx="2" fill="#dadbd8" />
            <rect x="160" y="92" width="14" height="8" rx="2" fill={accent} />
            <text
              x="86"
              y="92"
              textAnchor="middle"
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight="700"
              fontSize="22"
              letterSpacing="1.5"
              fill="#23211e"
            >
              GOODS GO
            </text>
            <circle cx="56" cy="118" r="23" fill="#222" />
            <circle cx="56" cy="118" r="9" fill="#cdcecb" />
            <circle cx="196" cy="118" r="23" fill="#222" />
            <circle cx="196" cy="118" r="9" fill="#cdcecb" />
          </svg>
        </div>

        {/* ── TRUCK: THIRD (optional) ────────────────────────── */}
        {showThird && (
          <div style={{ position: 'absolute', left: '71%', top: '61.5%', width: '12.5%' }}>
            <svg viewBox="0 0 268 150" width="100%" height="auto" style={{ display: 'block' }}>
              <rect x="6" y="36" width="150" height="76" rx="7" fill="#f1f2f0" />
              <rect x="156" y="62" width="66" height="50" rx="8" fill={accent3} />
              <path d="M198 67 h14 q9 0 12 8 l5 16 h-31 z" fill="#bfe1ea" />
              <rect x="6" y="108" width="216" height="7" rx="2" fill="#cccdc9" />
              <text
                x="82"
                y="84"
                textAnchor="middle"
                fontFamily="'Space Grotesk', sans-serif"
                fontWeight="700"
                fontSize="16"
                letterSpacing="1"
                fill="#5a5147"
              >
                GOODS GO
              </text>
              <circle cx="52" cy="116" r="18" fill="#272727" />
              <circle cx="52" cy="116" r="7" fill="#c9cac7" />
              <circle cx="190" cy="116" r="18" fill="#272727" />
              <circle cx="190" cy="116" r="7" fill="#c9cac7" />
            </svg>
          </div>
        )}

        {/* ── LEFT TREES ─────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            left: '-3%',
            bottom: '-4%',
            width: '20%',
            height: '58%',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '30%',
              bottom: 0,
              width: '60%',
              height: '78%',
              borderRadius: '50% 50% 46% 46%',
              background: '#36422a',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-6%',
              bottom: 0,
              width: '56%',
              height: '64%',
              borderRadius: '50% 50% 46% 46%',
              background: '#2b3522',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '14%',
              bottom: 0,
              width: '50%',
              height: '92%',
              borderRadius: '50% 50% 44% 44%',
              background: '#3d4a2f',
            }}
          />
        </div>

        {/* ── RIGHT TREES ────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            right: '-4%',
            bottom: '-5%',
            width: '22%',
            height: '52%',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '22%',
              bottom: 0,
              width: '58%',
              height: '84%',
              borderRadius: '50% 50% 46% 46%',
              background: '#36422a',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '-8%',
              bottom: 0,
              width: '54%',
              height: '66%',
              borderRadius: '50% 50% 46% 46%',
              background: '#2b3522',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '38%',
              bottom: 0,
              width: '46%',
              height: '70%',
              borderRadius: '50% 50% 44% 44%',
              background: '#3d4a2f',
            }}
          />
        </div>

        {/* foreground warm vignette for depth */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '26%',
            background:
              'linear-gradient(180deg, rgba(94,76,34,0) 0%, rgba(78,62,26,0.32) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── OPTIONAL HERO HEADLINE ─────────────────────────── */}
        {showHeadline && (
          <div
            style={{
              position: 'absolute',
              left: '7%',
              top: '50%',
              transform: 'translateY(-50%)',
              maxWidth: '44%',
              zIndex: 5,
            }}
          >
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(32px, 4.6vw, 76px)',
                lineHeight: 1.04,
                color: '#2a2620',
                letterSpacing: '-0.5px',
                textShadow: '0 2px 18px rgba(255,244,220,0.6)',
              }}
            >
              {headline}
            </div>
            <div
              style={{
                marginTop: '18px',
                fontSize: 'clamp(15px, 1.5vw, 22px)',
                fontWeight: 500,
                color: '#4a4338',
                maxWidth: '30ch',
              }}
            >
              {subhead}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

HeroBackground.propTypes = {
  truckCount: PropTypes.oneOf([2, 3]),
  accent: PropTypes.string,
  showHeadline: PropTypes.bool,
  headline: PropTypes.string,
  subhead: PropTypes.string,
};
