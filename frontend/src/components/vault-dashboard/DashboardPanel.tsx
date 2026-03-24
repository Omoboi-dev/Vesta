import type { Asset } from './useVaultLogic';
import { useState } from 'react';

interface DashboardPanelProps {
  onOpenSidebar: () => void;
  onOpenChat: () => void;
  portfolioValue: number;
  dailyChange: number;
  userAddress: string;
  assets: Asset[];
}

export default function DashboardPanel({ 
  onOpenSidebar, 
  onOpenChat, 
  portfolioValue, 
  dailyChange,
  userAddress,
  assets
}: DashboardPanelProps) {
  const [copied, setCopied] = useState(false);
  const truncatedAddress = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);

  const handleCopy = () => {
    navigator.clipboard.writeText(userAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full lg:w-[60%] h-full bg-surface p-6 md:p-8 lg:p-10 overflow-y-auto custom-scrollbar">
      <header className="flex justify-between items-center mb-10 md:mb-12">
        <div className="flex items-center space-x-3 md:space-x-4">
          <button 
            className="md:hidden p-2 -ml-2 text-on-surface hover:bg-surface-variant/50 rounded-full transition-colors"
            onClick={onOpenSidebar}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-surface-container-highest shrink-0">
            <img 
              className="w-full h-full object-cover" 
              alt="User profile avatar close up" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZ7QqyDETrUCdBg2tJGK8aAOjhQgVpET5tqC7OmByVbW8syVlOje5o4r4gMhSuocmcN7Igk1kPUKajAxCNe_hRFMknl2o2gkkJaS0GojQqStCM5sUav3a2Z5oIHnlhPeBJDOmxgsprBkIl0RNhQp6gZnQl32IOdpMZyuMdNas5Ka8q-5xxNMEfSO0bivaH0_X64akv1lOIr8-wH4ZZXWg815hwgUHfg9eiDsyIZWoJ47-uuztiwKsk_9c-7tWy7SzYd_ZIwlDd4IA"
            />
          </div>
          <div>
            <p className="text-[10px] md:text-xs font-semibold text-on-surface-variant/60">Welcome back</p>
            <h2 className="font-headline font-bold text-base md:text-lg">Alex Rivera</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div 
            onClick={handleCopy}
            className="hidden xs:flex items-center bg-surface-container-low px-3 md:px-4 py-2 rounded-full border border-outline-variant/20 hover:bg-surface-container transition-colors cursor-pointer group relative"
          >
            <span className="text-[10px] md:text-xs font-mono text-on-surface-variant mr-2 md:mr-3">{truncatedAddress}</span>
            <span className="material-symbols-outlined text-xs md:text-sm text-primary group-hover:scale-110 transition-transform">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                Copied!
              </span>
            )}
          </div>
          <button 
            className="lg:hidden w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
            onClick={onOpenChat}
          >
            <span className="material-symbols-outlined text-sm md:text-base">smart_toy</span>
          </button>
        </div>
      </header>

      <div className="mb-12 md:mb-16 transition-all duration-500">
        <span className="text-xs md:text-sm font-medium text-on-surface-variant/60 mb-2 block text-pulse">Total Portfolio Value</span>
        <h1 className="font-headline text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold text-on-surface tracking-tight leading-none break-all">
          ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <div className="mt-4 flex items-center text-tertiary font-semibold text-xs md:text-sm">
          <span className="material-symbols-outlined text-sm mr-1">trending_up</span>
          <span>+{dailyChange}% today</span>
        </div>
      </div>

      <div className="flex space-x-4 md:space-x-6 mb-12 md:mb-16 overflow-x-auto pb-4 custom-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
        <button className="group flex flex-col items-center space-y-2 md:space-y-3 shrink-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl md:text-2xl">north_east</span>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-on-surface-variant">Transfer</span>
        </button>
        <button className="group flex flex-col items-center space-y-2 md:space-y-3 shrink-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl md:text-2xl">swap_horiz</span>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-on-surface-variant">Swap</span>
        </button>
        <button className="group flex flex-col items-center space-y-2 md:space-y-3 shrink-0">
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl md:text-2xl">show_chart</span>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-on-surface-variant">Invest</span>
        </button>
      </div>

      <div className="space-y-3 md:space-y-4">
        <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4 md:mb-6">Your Assets</h3>
        {assets.map((asset) => (
          <div key={asset.symbol} className="bg-surface-container-lowest p-4 md:p-5 rounded-xl flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer border border-outline-variant/10">
            <div className="flex items-center space-x-3 md:space-x-4">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0`}>
                <span className={`material-symbols-outlined text-${asset.color || 'primary'} text-sm md:text-base`}>{asset.icon}</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-sm md:text-base">{asset.symbol}</p>
                <p className="text-[10px] md:text-xs text-on-surface-variant">{asset.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-on-surface text-sm md:text-base">{asset.balance}</p>
              <p className="text-[10px] md:text-xs text-on-surface-variant">{asset.valueUsd}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
