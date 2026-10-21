'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  FolderOpen,
  ArrowRight,
  Shield,
  Bot,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderSearch,
  Undo2,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StatCards } from '@/components/dashboard/StatCards';
import { RecentActivityList } from '@/components/dashboard/RecentActivityList';
import { FolderScanner } from '@/components/organizer/FolderScanner';
import { FileReviewTable } from '@/components/organizer/FileReviewTable';
import { PreviewModal } from '@/components/organizer/PreviewModal';
import { ActivityView } from '@/components/activity/ActivityView';
import { SettingsView } from '@/components/settings/SettingsView';
import { api, ApiError } from '@/lib/api-client';
import {
  AIStatus,
  DashboardStats,
  FolderScanResult,
  OperationPlanItem,
  OperationRecord,
  OrganizationSuggestion,
  PreviewOperationsResult,
} from '@/types';

export default function SweepyApp() {
  const [currentTab, setCurrentTab] = useState<'overview' | 'organize' | 'activity' | 'settings'>('overview');
  const [backendOnline, setBackendOnline] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Stats & History
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [operations, setOperations] = useState<OperationRecord[]>([]);

  // Scanning & Suggestions state
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<FolderScanResult | null>(null);
  const [suggestions, setSuggestions] = useState<OrganizationSuggestion[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('gemma3:1b');
  const [isAiEnabled, setIsAiEnabled] = useState(true);

  // Operations execution state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewOperationsResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  // Global notification banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    undoOpId?: string;
  } | null>(null);

  // Fetch status from backend and Ollama
  const checkSystemStatus = useCallback(async () => {
    setCheckingStatus(true);
    try {
      await api.getHealth();
      setBackendOnline(true);

      const ai = await api.getAiStatus();
      setAiStatus(ai);

      const ops = await api.listOperations(50);
      setOperations(ops);

      const st = await api.getStats(
        scanResult?.total_files || 0,
        suggestions.filter((s) => s.approved).length,
        suggestions.length
      );
      setStats(st);
    } catch {
      setBackendOnline(false);
      setAiStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  }, [scanResult, suggestions]);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      try {
        await api.getHealth();
        if (!active) return;
        setBackendOnline(true);
        const [ai, ops, st] = await Promise.all([
          api.getAiStatus(),
          api.listOperations(50),
          api.getStats(0, 0, 0),
        ]);
        if (!active) return;
        setAiStatus(ai);
        setOperations(ops);
        setStats(st);
      } catch {
        if (!active) return;
        setBackendOnline(false);
      }
    };
    loadInitial();
    return () => {
      active = false;
    };
  }, []);

  // When a folder scan completes, immediately query suggestions
  const handleScanComplete = async (result: FolderScanResult) => {
    setScanResult(result);
    setNotification(null);

    if (result.files.length === 0) {
      setSuggestions([]);
      setNotification({
        type: 'info',
        message: `No eligible files found in folder '${result.folder_name}'.`,
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const resp = await api.suggest({
        folder_path: result.folder_path,
        files: result.files,
        use_ai: true,
      });

      setSuggestions(resp.suggestions);
      setModelUsed(resp.model_used);
      setIsAiEnabled(resp.ai_enabled);

      if (resp.fallback_used) {
        setNotification({
          type: 'info',
          message: 'Ollama is offline or busy. Generated deterministic rule-based organization suggestions.',
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setNotification({ type: 'error', message: err.message });
      } else {
        setNotification({ type: 'error', message: 'Failed to generate organization suggestions.' });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update a single suggestion (e.g. approve/reject, edit path)
  const handleUpdateSuggestion = (id: string, updates: Partial<OrganizationSuggestion>) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Prepare preview before applying
  const handlePreviewAndApply = async () => {
    if (!scanResult) return;

    const approved = suggestions.filter((s) => s.approved);
    if (approved.length === 0) return;

    const items: OperationPlanItem[] = approved.map((s) => ({
      id: s.id,
      original_relative_path: s.original_relative_path,
      target_relative_path: s.proposed_relative_path,
      proposed_filename: s.proposed_filename,
      category: s.category,
      explanation: s.explanation,
      approved: true,
      conflict: false,
      size_bytes: s.size_bytes,
      formatted_size: s.formatted_size,
    }));

    try {
      const prev = await api.previewOperations({
        folder_path: scanResult.folder_path,
        items,
      });
      setPreviewData(prev);
      setIsPreviewOpen(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setNotification({ type: 'error', message: err.message });
      }
    }
  };

  // Execute approved operations
  const handleConfirmApply = async () => {
    if (!scanResult || !previewData) return;

    setIsApplying(true);
    try {
      const approvedItems = previewData.items.filter((i) => i.approved);
      const res = await api.applyOperations({
        folder_path: scanResult.folder_path,
        items: approvedItems,
      });

      // Remove successfully moved items from suggestions
      const appliedOriginals = new Set(
        res.results
          .filter((r) => r.status === 'completed')
          .map((r) => r.original_relative_path)
      );

      setSuggestions((prev) => prev.filter((s) => !appliedOriginals.has(s.original_relative_path)));

      // Refresh operations & stats
      const updatedOps = await api.listOperations(50);
      setOperations(updatedOps);

      const latestOpId = res.results.find((r) => r.status === 'completed')?.id;

      setNotification({
        type: 'success',
        message: res.message,
        undoOpId: latestOpId,
      });

      setIsPreviewOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setNotification({ type: 'error', message: err.message });
      } else {
        setNotification({ type: 'error', message: 'An unexpected error occurred while applying moves.' });
      }
    } finally {
      setIsApplying(false);
    }
  };

  // Undo a specific operation
  const handleUndo = async (operationId: string) => {
    setUndoingId(operationId);
    setNotification(null);
    try {
      const res = await api.undoOperation(operationId);
      setNotification({
        type: 'success',
        message: res.message,
      });

      // Refresh history & stats
      const updatedOps = await api.listOperations(50);
      setOperations(updatedOps);
      checkSystemStatus();
    } catch (err) {
      if (err instanceof ApiError) {
        setNotification({ type: 'error', message: err.message });
      } else {
        setNotification({ type: 'error', message: 'Failed to undo file operation.' });
      }
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        aiStatus={aiStatus}
        backendOnline={backendOnline}
        onRefreshStatus={checkSystemStatus}
        checkingStatus={checkingStatus}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`border-b text-xs py-2.5 px-4 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {notification.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
              <span className="font-medium">{notification.message}</span>
            </div>

            <div className="flex items-center gap-3">
              {notification.undoOpId && (
                <button
                  onClick={() => handleUndo(notification.undoOpId!)}
                  disabled={undoingId === notification.undoOpId}
                  className="inline-flex items-center gap-1 font-bold underline hover:no-underline cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </button>
              )}
              <button
                onClick={() => setNotification(null)}
                className="opacity-70 hover:opacity-100 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OVERVIEW TAB */}
        {currentTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Hero / Welcome card */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold mb-4 border border-white/10">
                  <Shield className="w-3.5 h-3.5" />
                  <span>100% Local Inference & Deterministic Safety</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Tidy up your downloads folder in seconds.
                </h1>
                <p className="mt-3 text-emerald-100 text-sm sm:text-base leading-relaxed">
                  Sweepy uses Ollama with <code className="bg-white/15 px-1.5 py-0.5 rounded text-white font-mono">gemma3:1b</code> to suggest clean, structured folder paths. AI only recommends — you review and approve every move before anything changes.
                </p>

                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setCurrentTab('organize')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-800 text-sm font-bold shadow-md hover:bg-emerald-50 transition-all hover:gap-3 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-700" />
                    <span>Organize a Folder</span>
                    <ArrowRight className="w-4 h-4 text-emerald-700" />
                  </button>

                  <button
                    onClick={() => setCurrentTab('settings')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold backdrop-blur-md transition-all border border-white/10 cursor-pointer"
                  >
                    <Bot className="w-4 h-4" />
                    <span>Model Status</span>
                  </button>
                </div>
              </div>

              {/* Decorative background grid pattern */}
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
                <Sparkles className="w-72 h-72 text-white" />
              </div>
            </div>

            {/* Stat Cards */}
            <StatCards stats={stats} />

            {/* Recent Operations */}
            <RecentActivityList
              operations={operations.slice(0, 5)}
              onUndo={handleUndo}
              undoingId={undoingId}
            />
          </div>
        )}

        {/* ORGANIZE TAB */}
        {currentTab === 'organize' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Folder Organizer</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Scan any folder on your PC, inspect suggested categorizations, and apply moves safely.
              </p>
            </div>

            {/* Folder selection & scan card */}
            <FolderScanner
              onScanComplete={handleScanComplete}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
            />

            {/* AI Analysis in progress indicator */}
            {isAnalyzing && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Evaluating Files with Gemma 3</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Categorizing documents, invoices, media, and archives based on filename patterns...
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-700 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating structured proposals...</span>
                </div>
              </div>
            )}

            {/* Review table when suggestions are available */}
            {!isAnalyzing && suggestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Organization Suggestions ({suggestions.length} files)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Target: {scanResult?.folder_path}
                  </span>
                </div>

                <FileReviewTable
                  suggestions={suggestions}
                  onUpdateSuggestion={handleUpdateSuggestion}
                  onPreviewAndApply={handlePreviewAndApply}
                  isApplying={isApplying}
                  modelUsed={modelUsed}
                  isAiEnabled={isAiEnabled}
                />
              </div>
            )}

            {/* Empty state when no folder has been scanned yet */}
            {!isScanning && !isAnalyzing && suggestions.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
                  <FolderSearch className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Folder Scanned Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Enter a directory path above or click <strong>Browse...</strong> to select your Downloads folder. Sweepy will scan the files and present AI-assisted categorization proposals.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {currentTab === 'activity' && (
          <div className="animate-in fade-in duration-200">
            <ActivityView
              operations={operations}
              onUndo={handleUndo}
              undoingId={undoingId}
              onRefresh={checkSystemStatus}
              isLoading={checkingStatus}
            />
          </div>
        )}

        {/* SETTINGS TAB */}
        {currentTab === 'settings' && (
          <div className="animate-in fade-in duration-200">
            <SettingsView
              aiStatus={aiStatus}
              backendOnline={backendOnline}
              onRefresh={checkSystemStatus}
              isChecking={checkingStatus}
            />
          </div>
        )}
      </main>

      {/* Confirmation & Safety Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previewData={previewData}
        onConfirmApply={handleConfirmApply}
        isApplying={isApplying}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Sweepy</span>
            <span>— Local-first AI Downloads Organizer. Safe, reversible, privacy-respecting.</span>
          </div>
          <div>
            Built with Next.js 16, FastAPI, Ollama, &amp; Gemma 3 1B
          </div>
        </div>
      </footer>
    </div>
  );
}
