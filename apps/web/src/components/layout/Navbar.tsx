'use client';

import React from 'react';
import { Sparkles, Bot, RefreshCw } from 'lucide-react';
import { AIStatus } from '@/types';

interface NavbarProps {
  currentTab: 'overview' | 'organize' | 'activity' | 'settings';
  onSelectTab: (tab: 'overview' | 'organize' | 'activity' | 'settings') => void;
  aiStatus: AIStatus | null;
  backendOnline: boolean;
  onRefreshStatus: () => void;
  checkingStatus: boolean;
}

export function Navbar({
  currentTab,
  onSelectTab,
  aiStatus,
  backendOnline,
  onRefreshStatus,
  checkingStatus,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-slate-900">Sweepy</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Local-First MVP
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Deterministic File Organizer</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => onSelectTab('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                currentTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onSelectTab('organize')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                currentTab === 'organize'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Organize
            </button>
            <button
              onClick={() => onSelectTab('activity')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                currentTab === 'activity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Activity & Undo
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                currentTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Settings
            </button>
          </nav>

          {/* Service Status Badges */}
          <div className="flex items-center gap-3">
            {/* Backend status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                backendOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="hidden sm:inline">Backend:</span> {backendOnline ? 'Online' : 'Offline'}
            </div>

            {/* Ollama Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                aiStatus?.connected && aiStatus?.model_available
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={aiStatus?.message || 'AI Status'}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>
                {aiStatus?.connected
                  ? aiStatus.model_available
                    ? 'Gemma 3 (1B)'
                    : 'Model Missing'
                  : 'Rule Fallback'}
              </span>
            </div>

            {/* Refresh status */}
            <button
              onClick={onRefreshStatus}
              disabled={checkingStatus}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh connection status"
            >
              <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
