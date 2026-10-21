'use client';

import React from 'react';
import {
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PreviewOperationsResult } from '@/types';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: PreviewOperationsResult | null;
  onConfirmApply: () => void;
  isApplying: boolean;
}

export function PreviewModal({
  isOpen,
  onClose,
  previewData,
  onConfirmApply,
  isApplying,
}: PreviewModalProps) {
  if (!isOpen || !previewData) return null;

  const approvedItems = previewData.items.filter((item) => item.approved);
  const conflictItems = previewData.items.filter((item) => item.conflict);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Review Planned File Operations</h3>
            <p className="text-xs text-slate-500">
              Confirm before executing filesystem changes. Nothing is altered until you click Confirm.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict Warning if any */}
        {conflictItems.length > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{conflictItems.length} potential conflict(s) detected.</span>
              <p className="mt-0.5 text-amber-700">
                Sweepy will never overwrite existing files. If a destination already exists, Sweepy will automatically append a safe counter suffix like &quot;(1)&quot;.
              </p>
            </div>
          </div>
        )}

        {/* Move list */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Operations to Execute ({approvedItems.length})
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {approvedItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 text-xs flex items-center justify-between gap-3 ${
                  item.conflict ? 'bg-amber-50/50' : 'bg-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-slate-700 truncate max-w-[200px]" title={item.original_relative_path}>
                      {item.original_relative_path}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono font-semibold text-emerald-700 truncate max-w-[220px]" title={item.target_relative_path}>
                      {item.target_relative_path}
                    </span>
                  </div>

                  {item.conflict && (
                    <div className="mt-1 text-[11px] text-amber-600 font-medium">
                      ⚠️ {item.conflict_reason}
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {item.formatted_size}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Guarantees Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Files are never deleted. All operations are logged for one-click Undo.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={onConfirmApply}
              disabled={isApplying || approvedItems.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md transition-all disabled:opacity-50"
            >
              {isApplying ? (
                <span>Executing Safe Moves...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Apply ({approvedItems.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
