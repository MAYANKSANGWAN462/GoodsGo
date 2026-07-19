import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import Button from '../components/common/Button';
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

// ── Scroll-reveal primitive ───────────────────────────────────────────────────
// Uses IntersectionObserver — fires once when element enters the viewport.
// willChange is reset after the transition so the GPU layer is released.

function ScrollReveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(30px)',
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: done ? 'auto' : 'opacity, transform',
      }}
      onTransitionEnd={() => setDone(true)}
    >
      {children}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ badge, title, subtitle }) {
  return (
    <ScrollReveal className="text-center mb-14">
      {badge && (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
          style={{ background: 'rgba(211,25,5,0.10)', color: '#D31905' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#D31905' }} />
          {badge}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-text mb-3">{title}</h2>
      {subtitle && (
        <p className="text-text-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed">{subtitle}</p>
      )}
    </ScrollReveal>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  {
    value: '3',
    label: 'Post Types',
    sublabel: 'Need transport, vehicle available, return journey',
    icon: <IconClipboard />,
    color: '#3b82f6',
  },
  {
    value: 'Live',
    label: 'Real-time Chat',
    sublabel: 'Instant messaging & push notifications',
    icon: <IconChat />,
    color: '#22c55e',
  },
  {
    value: '100%',
    label: 'Escrow Protected',
    sublabel: 'Funds held securely until delivery confirmed',
    icon: <IconShield />,
    color: '#f97316',
  },
  {
    value: 'KYC',
    label: 'Verified Profiles',
    sublabel: 'Identity-verified users you can trust',
    icon: <IconBadgeCheck />,
    color: '#8b5cf6',
  },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Post your need or offer',
    description: 'Create a listing in minutes — whether you need goods transported or have vehicle space available on a route.',
    icon: <IconClipboard />,
    color: '#3b82f6',
  },
  {
    step: '2',
    title: 'Connect & negotiate',
    description: 'Chat directly with the other party, agree on a fair price and logistics — no middlemen cutting in.',
    icon: <IconChat />,
    color: '#D31905',
  },
  {
    step: '3',
    title: 'Pay & move goods',
    description: 'Funds are held in escrow until both parties confirm successful delivery. Safe for everyone.',
    icon: <IconShield />,
    color: '#22c55e',
  },
];

const FEATURES = [
  {
    num: '01',
    title: 'Post a Transport Need',
    description: 'Need to move goods? Post your route, date, and cargo details. Transporters with available vehicles will reach out directly.',
    icon: <IconClipboard />,
    color: '#3b82f6',
    link: ROUTES.CREATE_POST,
    cta: 'Post a need',
  },
  {
    num: '02',
    title: 'Offer Vehicle Space',
    description: 'Have a truck or van with spare capacity? List your route and let people with goods book the space you already have.',
    icon: <IconTruck />,
    color: '#D31905',
    link: ROUTES.CREATE_POST,
    cta: 'List your vehicle',
  },
  {
    num: '03',
    title: 'Chat & Agree on Price',
    description: 'Message directly with the other party, negotiate a fair price, and confirm all details — no middlemen.',
    icon: <IconChat />,
    color: '#22c55e',
    link: ROUTES.MARKETPLACE,
    cta: 'Browse listings',
  },
  {
    num: '04',
    title: 'Secure Escrow Payment',
    description: 'Money is held safely until delivery is confirmed by both parties — so neither side takes the risk alone.',
    icon: <IconShield />,
    color: '#8b5cf6',
    link: ROUTES.MARKETPLACE,
    cta: 'Learn how',
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
            padding: '0 clamp(20px, 6%, 80px)',
            zIndex: 10,
          }}
        >
          {/* Badge */}
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

          {/* CTA buttons */}
          <div
            className="animate-fade-in"
            style={{ marginTop: '28px', display: 'flex', flexWrap: 'wrap', gap: '12px', animationDelay: '200ms' }}
          >
            <Link to={ROUTES.MARKETPLACE}>
              <Button size="lg">Browse Marketplace</Button>
            </Link>
            {!isAuthenticated && (
              <Link to={ROUTES.REGISTER}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-200"
                  style={{
                    padding: '10px 22px',
                    fontSize: '1rem',
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.14)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                >
                  Get started — it&apos;s free
                </button>
              </Link>
            )}
            {isAuthenticated && (
              <Link to={ROUTES.CREATE_POST}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-200"
                  style={{
                    padding: '10px 22px',
                    fontSize: '1rem',
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.14)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
                >
                  Create a post
                </button>
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
                className="inline-flex items-center gap-1.5 font-semibold transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  color: '#16130F',
                  textDecoration: 'none',
                }}
              >
                {label} <IconArrowRight />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface py-12 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {STATS.map((stat, idx) => (
            <ScrollReveal key={stat.label} delay={idx * 80} className="h-full">
              <div
                className="relative overflow-hidden flex flex-col flex-1 items-center text-center p-5 sm:p-6 rounded-2xl border border-border bg-surface-raised transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Coloured icon circle */}
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center mb-4 flex-shrink-0"
                  style={{ background: `${stat.color}18`, color: stat.color, width: 52, height: 52 }}
                >
                  {stat.icon}
                </div>

                {/* Value */}
                <span
                  className="text-3xl font-black mb-0.5"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </span>

                <span className="text-sm font-bold text-text mt-0.5">{stat.label}</span>
                <span className="text-xs text-text-muted mt-1 leading-snug">{stat.sublabel}</span>

                {/* Decorative background blob */}
                <div
                  className="absolute -right-5 -bottom-5 w-20 h-20 rounded-full pointer-events-none"
                  style={{ background: stat.color, opacity: 0.06 }}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-surface-alt">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            badge="Simple process"
            title="How GoodsGo works"
            subtitle="Three simple steps to move anything, anywhere across India."
          />

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Desktop connecting line */}
            <div
              className="hidden md:block absolute top-10 z-0 pointer-events-none"
              style={{ left: 'calc(16.66% + 16px)', right: 'calc(16.66% + 16px)', height: '2px' }}
              aria-hidden="true"
            >
              <div className="w-full h-full" style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #D31905 50%, #22c55e 100%)', opacity: 0.35, borderRadius: 9999 }} />
            </div>

            {HOW_IT_WORKS.map((item, idx) => (
              <ScrollReveal key={item.step} delay={idx * 110} className="relative z-10 h-full">
                <div className="flex flex-col flex-1 items-center text-center p-6 rounded-2xl border border-border bg-surface-raised transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                  {/* Step circle */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black mb-5 shadow-md ring-4 ring-surface flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${item.color}cc, ${item.color})` }}
                  >
                    {item.step}
                  </div>

                  {/* Icon under circle */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>

                  <h3 className="font-bold text-text text-base mb-2">{item.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-surface">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            badge="Everything you need"
            title="One platform, every step"
            subtitle="Post what you need, offer what you have, and get things moving — all in one place."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {FEATURES.map((feature, idx) => (
              <ScrollReveal key={feature.title} delay={idx * 90} className="h-full">
                <div
                  className="group relative overflow-hidden flex flex-col flex-1 rounded-2xl border border-border bg-surface-raised transition-all duration-300 hover:shadow-lg hover:-translate-y-1.5"
                  style={{ borderTopWidth: 3, borderTopColor: feature.color }}
                >
                  <div className="p-6 flex flex-col flex-1 gap-4">
                    {/* Step number */}
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: feature.color }}
                    >
                      {feature.num}
                    </span>

                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${feature.color}16`, color: feature.color }}
                    >
                      {feature.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col gap-2">
                      <h3 className="font-bold text-text text-base">{feature.title}</h3>
                      <p className="text-text-muted text-sm leading-relaxed flex-1">
                        {feature.description}
                      </p>
                    </div>

                    {/* CTA link */}
                    <Link
                      to={feature.link}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold mt-auto transition-all duration-200 group-hover:gap-2.5"
                      style={{ color: feature.color }}
                    >
                      {feature.cta} <IconArrowRight />
                    </Link>
                  </div>

                  {/* Decorative bottom-right blob */}
                  <div
                    className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                    style={{ background: `${feature.color}10` }}
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why trust GoodsGo ────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-surface-alt">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            badge="Built for trust"
            title="Why people choose GoodsGo"
            subtitle="Every feature is designed to keep your money, identity, and goods safe."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                icon: <IconShield />,
                color: '#f97316',
                title: 'Escrow payments',
                description: 'Your payment is held securely by us and only released once both parties confirm delivery.',
              },
              {
                icon: <IconBadgeCheck />,
                color: '#8b5cf6',
                title: 'KYC-verified only',
                description: 'Every transporter completes identity verification before they can list or accept a booking.',
              },
              {
                icon: <IconChat />,
                color: '#22c55e',
                title: 'Real-time chat',
                description: 'Negotiate, confirm, and co-ordinate directly inside the app with live in-app messaging.',
              },
              {
                icon: <IconTruck />,
                color: '#3b82f6',
                title: 'Pan-India routes',
                description: 'From metro cities to tier-2 towns — find or offer transport anywhere across India.',
              },
            ].map((item, idx) => (
              <ScrollReveal key={item.title} delay={idx * 80} className="h-full">
                <div className="flex flex-col flex-1 gap-4 p-5 sm:p-6 rounded-2xl border border-border bg-surface-raised transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    {item.icon}
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-1.5">
                    <p className="font-bold text-text text-sm">{item.title}</p>
                    <p className="text-xs text-text-muted leading-relaxed">{item.description}</p>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className="mt-auto h-0.5 w-8 rounded-full"
                    style={{ background: item.color, opacity: 0.5 }}
                  />
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section
          className="py-20 px-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #8B1009 0%, #D31905 42%, #0a1f4a 100%)' }}
        >
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <ScrollReveal className="relative mx-auto max-w-3xl text-center text-white">
            {/* Logo */}
            <div className="flex justify-center mb-6 opacity-90">
              <GoodsGoLogo size={52} />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to get moving?</h2>
            <p className="text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
              Join GoodsGo today — create a free account and start posting or browsing transport
              opportunities across India.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={ROUTES.REGISTER}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  style={{
                    padding: '12px 28px',
                    fontSize: '1rem',
                    background: '#ffffff',
                    color: '#D31905',
                    border: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8f8f8'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                >
                  Create a free account
                </button>
              </Link>
              <Link to={ROUTES.MARKETPLACE}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-200"
                  style={{
                    padding: '12px 28px',
                    fontSize: '1rem',
                    color: '#ffffff',
                    background: 'rgba(255,255,255,0.13)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
                >
                  Browse first <IconArrowRight />
                </button>
              </Link>
            </div>
          </ScrollReveal>
        </section>
      )}

      <Footer />
    </div>
  );
}
