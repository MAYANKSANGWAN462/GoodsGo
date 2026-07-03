import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Footer from './Footer';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
    // Scroll to top on route change
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-alt">
      <Navbar onMenuToggle={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Page content — extra bottom padding on mobile for the BottomNav */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 pt-6 pb-24 md:py-6">
        {/* key forces remount on route change, triggering each page's own entrance animation */}
        <div key={pathname}>
          <Outlet />
        </div>
      </main>

      {/* Footer — hidden on mobile (replaced by BottomNav) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </div>
  );
}
