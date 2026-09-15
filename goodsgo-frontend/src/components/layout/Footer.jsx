import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import GoodsGoLogo from '../common/GoodsGoLogo';
import useAuth from '../../hooks/useAuth';

const GUEST_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Register',    to: ROUTES.REGISTER },
  { label: 'Log in',      to: ROUTES.LOGIN },
];

const AUTH_LINKS = [
  { label: 'Marketplace', to: ROUTES.MARKETPLACE },
  { label: 'Create Post', to: ROUTES.CREATE_POST },
  { label: 'Bookings',    to: ROUTES.BOOKINGS },
  { label: 'My Profile',  to: ROUTES.MY_PROFILE },
];

/**
 * Social links. `hover` supplies the brand colour applied on hover; the base
 * state uses semantic tokens so both light and dark themes read correctly.
 */
const SOCIALS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/mayank-2a90a61a0/',
    hover: 'hover:bg-[#0a66c2]',
    icon: (
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/MAYANKSANGWAN462/',
    hover: 'hover:bg-[#24262a]',
    icon: (
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/mayanksangwan_77',
    hover: 'hover:bg-gradient-to-tr hover:from-[#405de6] hover:via-[#e1306c] hover:to-[#fd1f1f]',
    icon: (
      <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
    ),
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@MayankSangwan07',
    hover: 'hover:bg-[#ff0000]',
    icon: (
      <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z" />
    ),
  },
  {
    label: 'Website',
    href: 'https://mayanksangwan.vercel.app/',
    hover: 'hover:bg-primary',
    icon: (
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0M4.882 1.731a.48.48 0 0 0 .14.291.487.487 0 0 1-.126.78l-.291.146a.57.57 0 0 0-.288.339l-.146.435a.485.485 0 0 1-.921 0l-.155-.464a.57.57 0 0 1 0-.301l.076-.228c.058-.174.208-.301.39-.332l.16-.027a.987.987 0 0 0 .586-.297zm2.53 12.72c-.11.08-.24.13-.38.15a4.5 4.5 0 0 1-.86-.02 6.5 6.5 0 0 1-3.9-2.42c.08-.03.16-.05.24-.05.28.02.55.13.77.31.2.16.44.27.7.31.24.03.48.02.72-.04.19-.05.36-.16.49-.31.13-.15.31-.25.51-.28a.98.98 0 0 1 .78.24c.22.19.35.46.36.75.02.29-.08.57-.27.79l-.48.55zm4.16-1.66a6.5 6.5 0 0 1-2.31 1.47l.12-.36a.96.96 0 0 0-.05-.72l-.36-.72a.96.96 0 0 0-.86-.53H6.5a.96.96 0 0 1-.96-.96v-.48a.96.96 0 0 0-.96-.96H3.62a6.44 6.44 0 0 1-.62-2.78c0-.66.1-1.3.28-1.9h1.24c.26 0 .5-.1.68-.28l.86-.86a.96.96 0 0 0 .28-.68v-.19a6.5 6.5 0 0 1 5.36 2.02h-.7a.96.96 0 0 0-.68.28l-.48.48a.96.96 0 0 0 0 1.36l.48.48c.18.18.42.28.68.28h1.06c.04.31.06.63.06.96a6.47 6.47 0 0 1-1.05 3.55z" />
    ),
  },
];

export default function Footer() {
  const { isAuthenticated } = useAuth();
  const year = new Date().getFullYear();
  const links = isAuthenticated ? AUTH_LINKS : GUEST_LINKS;

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0 sm:flex-1 sm:justify-start">
            <GoodsGoLogo size={26} animated={false} />
            <span
              style={{ fontFamily: "'Barlow Semi Condensed', 'Barlow', sans-serif", fontWeight: 700, fontSize: '15px', letterSpacing: '0.03em' }}
              className="text-secondary dark:text-text"
            >
              GOODS<span className="text-primary">GO</span>
            </span>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex items-center gap-5 flex-wrap justify-center">
            {links.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-sm text-text-muted hover:text-primary transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Social */}
          <ul aria-label="Social links" className="flex items-center gap-2.5 flex-shrink-0 sm:flex-1 sm:justify-end">
            {SOCIALS.map(({ label, href, hover, icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={[
                    'group flex h-9 w-9 items-center justify-center rounded-full',
                    'border border-border bg-surface-alt text-text-muted',
                    'transition-all duration-200',
                    'hover:-translate-y-0.5 hover:border-transparent hover:text-white hover:shadow-md',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                    hover,
                  ].join(' ')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:scale-110"
                  >
                    {icon}
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-text-subtle text-center">
            &copy; {year} GoodsGo &middot; Built by Mayank Sangwan
          </p>
        </div>
      </div>
    </footer>
  );
}
