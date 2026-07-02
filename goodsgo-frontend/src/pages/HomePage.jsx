import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import HeroBackground from '../components/home/HeroBackground';
import GoodsGoLogo from '../components/common/GoodsGoLogo';
import useAuth from '../hooks/useAuth';

// ── Icons ────────────────────────────────────────────────────────────────────

function IconClipboard() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6m9 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function IconBadgeCheck() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.497 3.842 3.745 3.745 0 01-3.843.497A3.745 3.745 0 0112 21 3.745 3.745 0 019.933 19.407a3.745 3.745 0 01-3.842-.497 3.745 3.745 0 01-.497-3.842A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.497-3.842 3.745 3.745 0 013.842-.497A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.842.497 3.745 3.745 0 01.497 3.842A3.745 3.745 0 0121 12z" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  {
    value: '3',
    label: 'Post Types',
    sublabel: 'Need transport, vehicle available, return journey',
    icon: <IconClipboard />,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    value: 'Live',
    label: 'Real-time Chat',
    sublabel: 'Instant messaging & notifications',
    icon: <IconChat />,
    color: 'bg-green-100 text-green-600',
  },
  {
    value: '100%',
    label: 'Escrow Protection',
    sublabel: 'Funds held until delivery confirmed',
    icon: <IconShield />,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    value: 'KYC',
    label: 'Verified Profiles',
    sublabel: 'Identity-verified users you can trust',
    icon: <IconBadgeCheck />,
    color: 'bg-purple-100 text-purple-600',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Post your need or offer',
    description: 'Create a listing in minutes — whether you need goods transported or have vehicle space available.',
  },
  {
    step: '02',
    title: 'Connect & negotiate',
    description: 'Chat directly with the other party, agree on a price and logistics — no middlemen.',
  },
  {
    step: '03',
    title: 'Pay & move goods',
    description: 'Funds are held in escrow until both parties confirm successful delivery.',
  },
];

const FEATURES = [
  {
    num: '01',
    title: 'Post a Transport Need',
    description: 'Need to move goods? Post your route, date, and cargo details. Transporters with available vehicles will reach out directly.',
    icon: <IconClipboard />,
    color: 'bg-blue-50 text-blue-600',
    link: ROUTES.CREATE_POST,
  },
  {
    num: '02',
    title: 'Offer Vehicle Space',
    description: 'Have a truck or van with spare capacity? List your route and let people with goods book the space you already have.',
    icon: <IconTruck />,
    color: 'bg-orange-50 text-primary',
    link: ROUTES.CREATE_POST,
  },
  {
    num: '03',
    title: 'Chat & Agree on Price',
    description: 'Message directly with the other party, negotiate a fair price, and confirm all the details — no middlemen.',
    icon: <IconChat />,
    color: 'bg-green-50 text-green-600',
    link: ROUTES.MARKETPLACE,
  },
  {
    num: '04',
    title: 'Secure Escrow Payment',
    description: 'Money is held safely until delivery is confirmed by both parties — so neither side takes the risk alone.',
    icon: <IconShield />,
    color: 'bg-purple-50 text-purple-600',
    link: ROUTES.MARKETPLACE,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: 'min(100vh, 720px)', minHeight: '520px' }}>
        <HeroBackground />
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
          {/* Animated badge */}
          <div
            className="animate-fade-in-down"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.38)',
              borderRadius: '9999px',
              padding: '4px 14px',
              marginBottom: '12px',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D31905', display: 'inline-block' }} />
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '13px', color: '#ffffff', letterSpacing: '0.02em' }}>
              India&apos;s logistics marketplace
            </span>
          </div>

          <GoodsGoLogo size={72} animated />

          <h1
            className="animate-fade-in-up"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 72px)',
              lineHeight: 1.04,
              color: '#ffffff',
              letterSpacing: '-0.5px',
              textShadow: '0 2px 24px rgba(6,22,44,0.4)',
              maxWidth: '14ch',
              margin: '20px 0 0',
            }}
          >
            Move goods.{' '}
            <span style={{ color: '#D31905' }}>Find transport.</span>
          </h1>

          <p
            className="animate-fade-in"
            style={{
              marginTop: '16px',
              fontFamily: "'Manrope', sans-serif",
              fontSize: 'clamp(15px, 1.4vw, 20px)',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.90)',
              maxWidth: '38ch',
              lineHeight: 1.55,
              textShadow: '0 1px 12px rgba(6,22,44,0.3)',
              animationDelay: '120ms',
            }}
          >
            GoodsGo connects people who need to transport goods with vehicle owners — simply,
            transparently, and securely.
          </p>

          {/* Primary CTA buttons */}
          <div
            className="animate-fade-in"
            style={{ marginTop: '28px', display: 'flex', flexWrap: 'wrap', gap: '12px', animationDelay: '200ms' }}
          >
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

          {/* Quick-action pills */}
          <div
            className="animate-fade-in"
            style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', animationDelay: '300ms' }}
          >
            {[
              { label: 'I need transport', to: `${ROUTES.MARKETPLACE}?post_type=need_transport` },
              { label: 'I have a vehicle', to: `${ROUTES.MARKETPLACE}?post_type=vehicle_available` },
              { label: 'Browse all posts', to: ROUTES.MARKETPLACE },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(255,255,255,0.72)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#16130F',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                {label} <IconArrowRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface py-10 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className="animate-fade-in-up flex flex-col items-center text-center p-5 rounded-xl bg-surface border border-border shadow-sm hover:shadow-md transition-shadow"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-2xl font-bold text-text">{stat.value}</span>
              <span className="text-sm font-semibold text-text mt-0.5">{stat.label}</span>
              <span className="text-xs text-text-muted mt-1 leading-snug">{stat.sublabel}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-surface-alt">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-text text-center mb-3">How GoodsGo works</h2>
          <p className="text-text-muted text-center max-w-xl mx-auto mb-14 text-base">
            Three simple steps to move anything, anywhere.
          </p>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting line — desktop only */}
            <div
              className="hidden md:block absolute top-9 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-border z-0"
              aria-hidden="true"
            />

            {HOW_IT_WORKS.map((step, idx) => (
              <div
                key={step.step}
                className="animate-fade-in-up relative z-10 flex flex-col items-center text-center"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold mb-4 shadow-md ring-4 ring-surface">
                  {idx + 1}
                </div>
                <h3 className="font-semibold text-text text-base mb-2">{step.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-surface">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-text text-center mb-3">
            Everything you need
          </h2>
          <p className="text-text-muted text-center max-w-xl mx-auto mb-14 text-lg">
            One platform — post what you need, offer what you have, get things moving.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, idx) => (
              <div
                key={feature.title}
                className="animate-fade-in-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <Card elevation="sm" hoverable className="h-full flex flex-col gap-4 p-6">
                  {/* Step number */}
                  <span className="text-xs font-bold text-text-subtle tracking-widest uppercase">
                    {feature.num}
                  </span>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-2">
                    <h3 className="font-semibold text-text text-base">{feature.title}</h3>
                    <p className="text-text-muted text-sm leading-relaxed flex-1">
                      {feature.description}
                    </p>
                  </div>

                  {/* Learn more link */}
                  <Link
                    to={feature.link}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mt-auto"
                  >
                    Learn more <IconArrowRight />
                  </Link>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="bg-primary py-16 px-4">
          <div className="mx-auto max-w-3xl text-center text-white">
            {/* Logo in CTA */}
            <div className="flex justify-center mb-6 opacity-90">
              <GoodsGoLogo size={48} />
            </div>

            <h2 className="text-3xl font-bold mb-4">Ready to get moving?</h2>
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

      <Footer />
    </div>
  );
}
