import { Outlet } from 'react-router-dom';

/**
 * Admin shell layout — stub for FE-1. Full implementation in FE-Admin block.
 */
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <aside className="w-56 border-r border-gray-700 p-4">
        <p className="font-bold text-lg text-primary">GoodsGo Admin</p>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
