import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssets } from '../../hooks/useAssets';
import { Search, X } from 'lucide-react';

interface AssetSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssetSearchModal: React.FC<AssetSearchModalProps> = ({ isOpen, onClose }) => {
  const { assets } = useAssets();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filtered = assets.filter((a) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return a.symbol.toLowerCase().includes(q) || (a.name && a.name.toLowerCase().includes(q));
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (symbol: string) => {
    onClose();
    navigate(`/assets/${symbol}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex].symbol);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-start justify-center pt-24 p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-300 shadow-xl rounded-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-3 py-2.5 border-b border-slate-200 gap-2 bg-slate-50">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tracked cryptocurrency..."
            className="flex-1 bg-transparent text-xs font-mono text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-0.5"
            aria-label="Close search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-400">
              No matching assets found
            </div>
          ) : (
            filtered.map((asset, idx) => (
              <div
                key={asset.symbol}
                onClick={() => handleSelect(asset.symbol)}
                className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer font-mono ${
                  idx === selectedIndex ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{asset.symbol}</span>
                  {asset.name && (
                    <span className="text-2xs text-slate-400 font-sans font-normal">
                      {asset.name}
                    </span>
                  )}
                </div>
                <span className="text-2xs text-slate-400">Navigate ↵</span>
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] font-mono text-slate-500 flex justify-between">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Cancel</span>
        </div>
      </div>
    </div>
  );
};
