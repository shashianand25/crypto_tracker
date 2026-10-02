import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopBar } from '../components/navigation/TopBar';
import { AssetSearchModal } from '../components/navigation/AssetSearchModal';
import { NotificationCenter } from '../components/common/NotificationCenter';

export const AppShell: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        <TopBar onOpenSearch={() => setIsSearchOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <Outlet />
        </main>
      </div>

      {/* Search Modal */}
      <AssetSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Live Toast Notifications */}
      <NotificationCenter />
    </div>
  );
};
