'use client';

import React from 'react';
import { History, Undo2, ArrowRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { OperationRecord } from '@/types';
import { formatDate } from '@/lib/utils';

interface RecentActivityListProps {
  operations: OperationRecord[];
  onUndo: (operationId: string) => void;
  undoingId: string | null;
}

export function RecentActivityList({ operations, onUndo, undoingId }: RecentActivityListProps) {
  if (!operations || operations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
          <History className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Operations Yet</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
          When you scan a folder and apply organization suggestions, your history and safe undo options will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-900">Recent File Operations</h3>
        </div>
        <span className="text-xs text-slate-500">{operations.length} recorded</span>
      </div>

      <div className="divide-y divide-slate-100">
        {operations.map((op) => {
          const isCompleted = op.status === 'completed';
          const isUndone = op.status === 'undone' || op.is_undone;
          const isFailed = op.status === 'failed';
          const isCurrentUndoing = undoingId === op.id;

          return (
            <div key={op.id} className="p-4 sm:px-6 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-medium text-slate-900 truncate max-w-[200px]" title={op.original_relative_path}>
                    {op.original_relative_path}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-emerald-700 truncate max-w-[250px]" title={op.final_relative_path}>
                    {op.final_relative_path}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span>{formatDate(op.created_at)}</span>
                  <span>•</span>
                  <span className="truncate max-w-[200px]" title={op.folder_path}>
                    {op.folder_path}
                  </span>

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Safe Move
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

              {/* Action */}
              <div className="shrink-0 flex items-center">
                {isCompleted && (
                  <button
                    onClick={() => onUndo(op.id)}
                    disabled={isCurrentUndoing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs transition-all disabled:opacity-50"
                  >
                    <Undo2 className={`w-3.5 h-3.5 ${isCurrentUndoing ? 'animate-spin' : ''}`} />
                    {isCurrentUndoing ? 'Reverting...' : 'Undo Move'}
                  </button>
                )}
                {isUndone && (
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                    Restored
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
