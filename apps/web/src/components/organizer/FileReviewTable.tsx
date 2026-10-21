'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  Edit2,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { OrganizationSuggestion } from '@/types';
import { getCategoryBadgeStyle } from '@/lib/utils';

interface FileReviewTableProps {
  suggestions: OrganizationSuggestion[];
  onUpdateSuggestion: (id: string, updates: Partial<OrganizationSuggestion>) => void;
  onPreviewAndApply: () => void;
  isApplying: boolean;
  modelUsed: string;
  isAiEnabled: boolean;
}

export function FileReviewTable({
  suggestions,
  onUpdateSuggestion,
  onPreviewAndApply,
  isApplying,
  modelUsed,
  isAiEnabled,
}: FileReviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProposedPath, setEditProposedPath] = useState('');

  // Extract all categories present
  const categories = useMemo(() => {
    const set = new Set<string>();
    suggestions.forEach((s) => set.add(s.category));
    return ['All', ...Array.from(set)];
  }, [suggestions]);

  // Filtered items
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesSearch =
        s.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.proposed_relative_path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [suggestions, searchQuery, selectedCategory]);

  const approvedCount = suggestions.filter((s) => s.approved).length;
  const allFilteredApproved = filteredSuggestions.length > 0 && filteredSuggestions.every((s) => s.approved);

  const toggleSelectAllFiltered = () => {
    const targetState = !allFilteredApproved;
    filteredSuggestions.forEach((s) => {
      onUpdateSuggestion(s.id, { approved: targetState });
    });
  };

  const startEdit = (s: OrganizationSuggestion) => {
    setEditingId(s.id);
    setEditProposedPath(s.proposed_relative_path);
  };

  const saveEdit = (id: string) => {
    if (editProposedPath.trim()) {
      const parts = editProposedPath.replace(/\\/g, '/').split('/');
      const filename = parts[parts.length - 1];
      onUpdateSuggestion(id, {
        proposed_relative_path: editProposedPath.trim(),
        proposed_filename: filename,
      });
    }
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
      {/* Top action bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAiEnabled ? 'AI' : 'Rule'}: {modelUsed}</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {approvedCount} of {suggestions.length} approved
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAllFiltered}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            {allFilteredApproved ? 'Deselect Filtered' : 'Select All Filtered'}
          </button>

          <button
            onClick={onPreviewAndApply}
            disabled={approvedCount === 0 || isApplying}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Review & Apply ({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename or destination..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allFilteredApproved}
                  onChange={toggleSelectAllFiltered}
                  className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4">Original File</th>
              <th className="py-3 px-4">Proposed Location</th>
              <th className="py-3 px-4 w-28">Category</th>
              <th className="py-3 px-4 w-24">Size</th>
              <th className="py-3 px-4 min-w-[180px]">AI Reasoning</th>
              <th className="py-3 px-4 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSuggestions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No files match your search criteria.
                </td>
              </tr>
            ) : (
              filteredSuggestions.map((s) => {
                const badge = getCategoryBadgeStyle(s.category);
                const isEditing = editingId === s.id;

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      s.approved ? 'hover:bg-slate-50/70' : 'bg-slate-50/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={s.approved}
                        onChange={(e) => onUpdateSuggestion(s.id, { approved: e.target.checked })}
                        className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* Original filename */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[220px]" title={s.original_filename}>
                        {s.original_filename}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                        {s.original_relative_path}
                      </div>
                    </td>

                    {/* Proposed Destination */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editProposedPath}
                            onChange={(e) => setEditProposedPath(e.target.value)}
                            className="px-2 py-1 bg-white border border-emerald-500 rounded-md text-xs font-mono w-full"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(s.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => saveEdit(s.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded-sm"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span
                            className="font-mono font-medium text-emerald-800 bg-emerald-50/60 px-2 py-0.5 rounded-md border border-emerald-100 truncate max-w-[260px]"
                            title={s.proposed_relative_path}
                          >
                            {s.proposed_relative_path}
                          </span>
                          <button
                            onClick={() => startEdit(s)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-opacity"
                            title="Edit destination path"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {s.category}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {s.formatted_size}
                    </td>

                    {/* AI Reasoning */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="truncate max-w-[260px]" title={s.explanation}>
                        {s.explanation}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                        <span className="capitalize">{s.source} suggestion</span>
                        <span>•</span>
                        <span>{Math.round(s.confidence * 100)}% conf.</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => onUpdateSuggestion(s.id, { approved: !s.approved })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            s.approved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {s.approved ? 'Approved' : 'Rejected'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
