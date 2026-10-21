'use client';

import React from 'react';
import { Files, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import { DashboardStats } from '@/types';

interface StatCardsProps {
  stats: DashboardStats | null;
}

export function StatCards({ stats }: StatCardsProps) {
  const cards = [
    {
      title: 'Files Scanned',
      value: stats ? stats.files_scanned.toLocaleString() : '0',
      description: 'Total files evaluated',
      icon: Files,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Awaiting Review',
      value: stats ? stats.awaiting_review.toLocaleString() : '0',
      description: 'Files needing confirmation',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      title: 'AI Suggestions',
      value: stats ? stats.suggestions_count.toLocaleString() : '0',
      description: 'Generated organization paths',
      icon: Sparkles,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      title: 'Completed Moves',
      value: stats ? stats.completed_operations.toLocaleString() : '0',
      description: 'Safely applied & reversible',
      icon: CheckCircle2,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs transition-all hover:shadow-md hover:border-slate-300/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold tracking-tight text-slate-900">{card.value}</span>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
