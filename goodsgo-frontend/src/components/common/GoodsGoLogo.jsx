import PropTypes from 'prop-types';

const RUSH_ANIM_CSS = `
  .gg-rush { animation: ggRushPulse 1.6s ease-in-out infinite; }
  .d1 { animation-delay: 0s; }
  .d2 { animation-delay: 0.2s; }
  .d3 { animation-delay: 0.4s; }
  .d4 { animation-delay: 0.6s; }
  @keyframes ggRushPulse {
    0%, 100% { opacity: 0.85; }
    45%       { opacity: 0.25; }
  }
  .gg-streak { animation: ggStreakBlink 1.4s ease-in-out infinite; }
  @keyframes ggStreakBlink {
    0%, 100% { opacity: 0.2; }
    35%, 65%  { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .gg-rush, .gg-streak { animation: none; }
  }
`;

/**
 * Inline SVG logo mark for GOODS GO — crisp on any background at any size.
 * Uses brand colours: Go Red (#D31905) and Freight Blue (#003082).
 *
 * @param {object}  props
 * @param {number}  props.size      - Square size in px. Default 40.
 * @param {boolean} props.animated  - Enable CSS rush/streak animation. Default true.
 * @param {string}  props.className - Extra CSS classes for the <svg>.
 */
export default function GoodsGoLogo({ size = 40, animated = true, className = '' }) {
  const rushClass = (delays) =>
    animated ? `gg-rush ${delays}` : undefined;
  const streakClass = animated ? 'gg-streak' : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      role="img"
      aria-label="GOODS GO"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {animated && <defs><style>{RUSH_ANIM_CSS}</style></defs>}

      {/* speed indicator pills */}
      <g fill="#003082">
        <rect className={rushClass('d1')} x="150" y="182" width="96" height="16" rx="8" />
        <rect className={rushClass('d3')} x="178" y="204" width="34" height="16" rx="8" />
      </g>
      <g fill="#D31905">
        <rect className={rushClass('d2')} x="104" y="204" width="62" height="16" rx="8" />
        <rect className={rushClass('d2')} x="246" y="204" width="46" height="16" rx="8" />
      </g>

      {/* left speed streaks */}
      <g>
        <rect className={streakClass} style={{ animationDelay: '0s' }}
              x="58" y="233" width="58" height="3" rx="1.5" fill="#003082" />
        <rect className={streakClass} style={{ animationDelay: '.5s' }}
              x="50" y="245" width="66" height="3" rx="1.5" fill="#D31905" />
        <rect className={streakClass} style={{ animationDelay: '.9s' }}
              x="62" y="257" width="54" height="3" rx="1.5" fill="#003082" />
      </g>

      {/* cargo container speed lines */}
      <g fill="#003082">
        <rect className={rushClass('d1')} x="130" y="231" width="200" height="6" rx="3" />
        <rect className={rushClass('d2')} x="150" y="241" width="180" height="6" rx="3" />
        <rect className={rushClass('d3')} x="176" y="251" width="154" height="6" rx="3" />
        <rect className={rushClass('d4')} x="138" y="261" width="192" height="6" rx="3" />
      </g>

      {/* truck body */}
      <g fill="#D31905">
        <rect x="110" y="268" width="350" height="32" rx="7" />
        <path d="M340,300 L340,206 L426,206 L456,238 L456,300 Z" />
        <circle cx="232" cy="302" r="21" />
        <circle cx="412" cy="302" r="21" />
      </g>

      {/* windscreen */}
      <path d="M430,214 L451,236 L451,258 L427,258 L427,214 Z" fill="#fff" />

      {/* cab window dividers */}
      <g fill="#fff">
        <path d="M349,212 L356,212 L350,256 L343,256 Z" />
        <path d="M365,212 L372,212 L366,256 L359,256 Z" />
      </g>

      {/* wheel hubs */}
      <g>
        <circle cx="232" cy="302" r="12" fill="#fff" />
        <circle cx="232" cy="302" r="4.4" fill="#D31905" />
        <circle cx="412" cy="302" r="12" fill="#fff" />
        <circle cx="412" cy="302" r="4.4" fill="#D31905" />
      </g>

      {/* wordmark */}
      <text
        x="300" y="293"
        textAnchor="middle"
        textLength="128"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="'Arial Narrow','Helvetica Neue',Arial,sans-serif"
        fontWeight="800"
        fontSize="20"
        fill="#fff"
      >
        GOODS GO
      </text>
    </svg>
  );
}

GoodsGoLogo.propTypes = {
  size: PropTypes.number,
  animated: PropTypes.bool,
  className: PropTypes.string,
};
