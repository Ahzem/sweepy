'use client';

import React, { useState } from 'react';
import { History, Undo2, ArrowRight, CheckCircle2, RotateCcw, XCircle, Search, RefreshCw } from 'lucide-react';
import { OperationRecord } from '@/types';
import { formatDate } from '@/lib/utils';

interface ActivityViewProps {
  operations: OperationRecord[];
  onUndo: (operationId: string) => void;
  undoingId: string | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ActivityView({
  operations,
  onUndo,
  undoingId,
  onRefresh,
  isLoading,
}: ActivityViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = operations.filter((op) => {
    const q = searchQuery.toLowerCase();
    return (
      op.original_relative_path.toLowerCase().includes(q) ||
      op.final_relative_path.toLowerCase().includes(q) ||
      op.folder_path.toLowerCase().includes(q)
    );
  });

  const completedCount = operations.filter((op) => op.status === 'completed').length;
  const undoneCount = operations.filter((op) => op.status === 'undone' || op.is_undone).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Operation History & Undo</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Safely reverse completed file moves back to their original locations.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
          Total Recorded: <span className="font-bold text-slate-900">{operations.length}</span>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 shadow-2xs">
          Active Moves: <span className="font-bold text-emerald-900">{completedCount}</span>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
          Restored (Undone): <span className="font-bold text-slate-900">{undoneCount}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history by original or target path..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No Operations Recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              File moves executed through Sweepy will be listed here with undo capabilities.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((op) => {
              const isCompleted = op.status === 'completed';
              const isUndone = op.status === 'undone' || op.is_undone;
              const isFailed = op.status === 'failed';
              const isCurrentUndoing = undoingId === op.id;

              return (
                <div
                  key={op.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 font-mono" title={op.original_relative_path}>
                        {op.original_relative_path}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-emerald-700 font-mono" title={op.final_relative_path}>
                        {op.final_relative_path}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-slate-500">
                      <span>{formatDate(op.created_at)}</span>
                      <span>•</span>
                      <span className="truncate max-w-[240px]" title={op.folder_path}>
                        {op.folder_path}
                      </span>

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Move
                        </span>
                      )}
                      {isUndone && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <RotateCcw className="w-3 h-3 text-amber-600" /> Restored
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-medium" title={op.error_message || 'Failed'}>
                          <XCircle className="w-3 h-3 text-rose-600" /> Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isCompleted && (
                      <button
                        onClick={() => onUndo(op.id)}
                        disabled={isCurrentUndoing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Undo2 className={`w-3.5 h-3.5 ${isCurrentUndoing ? 'animate-spin' : ''}`} />
                        <span>{isCurrentUndoing ? 'Reverting...' : 'Undo Move'}</span>
                      </button>
                    )}
                    {isUndone && (
                      <span className="font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                        Restored {op.undone_at ? `(${formatDate(op.undone_at)})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
