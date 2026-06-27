import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import HeroBackground from '../components/home/HeroBackground';
import GoodsGoLogo from '../components/common/GoodsGoLogo';
import useAuth from '../hooks/useAuth';

const FEATURES = [
  {
    title: 'Post a Transport Need',
    description:
      'Need to move goods? Post your route, date, and cargo details. Transporters with available vehicles will reach out directly.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    title: 'Offer Vehicle Space',
    description:
      'Have a truck or van with spare capacity? List your route and let people with goods book the space you already have.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    title: 'Chat & Agree on Price',
    description:
      'Message directly with the other party, negotiate a fair price, and confirm all the details — no middlemen.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    title: 'Secure Escrow Payment',
    description:
      'Money is held safely until delivery is confirmed by both parties — so neither side takes the risk alone.',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
];

const STATS = [
  { value: '3 types', label: 'of transport posts' },
  { value: 'Real-time', label: 'chat & notifications' },
  { value: 'Escrow', label: 'payment protection' },
  { value: 'Verified', label: 'user profiles' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      {/* Navbar — public, no sidebar */}
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: 'min(100vh, 680px)', minHeight: '480px' }}>
        {/* Scenic background illustration */}
        <HeroBackground />

        {/* Content overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '0 6%',
            zIndex: 10,
          }}
        >
          <GoodsGoLogo size={72} animated />
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 72px)',
              lineHeight: 1.04,
              color: '#16130F',
              letterSpacing: '-0.5px',
              textShadow: '0 2px 18px rgba(255,244,220,0.6)',
              maxWidth: '14ch',
              margin: '20px 0 0',
            }}
          >
            Move goods.{' '}
            <span style={{ color: '#D31905' }}>Find transport.</span>
          </h1>
          <p
            style={{
              marginTop: '16px',
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(15px, 1.4vw, 20px)',
              fontWeight: 500,
              color: '#4a4338',
              maxWidth: '38ch',
              lineHeight: 1.55,
            }}
          >
            GoodsGo connects people who need to transport goods with vehicle owners — simply,
            transparently, and securely.
          </p>
          <div style={{ marginTop: '28px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Link to={ROUTES.MARKETPLACE}>
              <Button size="lg">Browse Marketplace</Button>
            </Link>
            {!isAuthenticated && (
              <Link to={ROUTES.REGISTER}>
                <Button variant="secondary" size="lg">
                  Get started — it&apos;s free
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link to={ROUTES.CREATE_POST}>
                <Button variant="secondary" size="lg">
                  Create a post
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats strip ───────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface-alt py-8 px-4">
        <div className="mx-auto max-w-4xl grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <span className="text-2xl font-bold text-primary">{stat.value}</span>
              <span className="text-sm text-text-muted mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-surface">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-text text-center mb-3">
            How GoodsGo works
          </h2>
          <p className="text-text-muted text-center max-w-xl mx-auto mb-14 text-lg">
            One platform — post what you need, offer what you have, get things moving.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center text-primary flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-text text-lg mb-2">{feature.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA section ───────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="bg-primary py-16 px-4">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to get moving?
            </h2>
            <p className="text-red-100 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Join GoodsGo today — create a free account and start posting or browsing transport
              opportunities across India.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={ROUTES.REGISTER}>
                <Button variant="secondary" size="lg">
                  Create a free account
                </Button>
              </Link>
              <Link to={ROUTES.MARKETPLACE}>
                <button
                  type="button"
                  className="px-6 py-3 text-base font-medium text-white border border-white/70 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Browse first
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
