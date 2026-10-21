'use client';

import React, { useState } from 'react';
import { FolderSearch, Folder, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { FolderScanResult, FolderValidation } from '@/types';

interface FolderScannerProps {
  onScanComplete: (result: FolderScanResult) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

export function FolderScanner({ onScanComplete, isScanning, setIsScanning }: FolderScannerProps) {
  const [folderPath, setFolderPath] = useState('');
  const [recursive, setRecursive] = useState(false);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [validationInfo, setValidationInfo] = useState<FolderValidation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBrowse = async () => {
    setIsBrowsing(true);
    setErrorMessage(null);
    try {
      const res = await api.browseFolder(folderPath);
      if (res.selected_path) {
        setFolderPath(res.selected_path);
        // Automatically validate
        const val = await api.validateFolder(res.selected_path);
        setValidationInfo(val);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to open folder picker dialog.');
      }
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleQuickSelect = async (path: string) => {
    setFolderPath(path);
    setErrorMessage(null);
    try {
      const val = await api.validateFolder(path);
      setValidationInfo(val);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      }
    }
  };

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!folderPath.trim()) {
      setErrorMessage('Please enter or select a folder path to scan.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);

    try {
      const result = await api.scanFolder({
        path: folderPath.trim(),
        recursive,
        include_hidden: includeHidden,
      });

      onScanComplete(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to scan directory. Check permissions and path.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <FolderSearch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Select Folder to Organize</h2>
            <p className="text-xs text-slate-500">Local-only directory scan. No files will be moved without your approval.</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local & Safe</span>
        </div>
      </div>

      <form onSubmit={handleScan} className="space-y-4">
        {/* Path input & Browse button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => {
                setFolderPath(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="e.g. C:\Users\Username\Downloads"
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
            />
            {folderPath && (
              <button
                type="button"
                onClick={() => setFolderPath('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleBrowse}
            disabled={isBrowsing || isScanning}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-sm font-medium rounded-xl border border-slate-200/80 transition-all disabled:opacity-50"
          >
            <Folder className="w-4 h-4 text-slate-600" />
            <span>{isBrowsing ? 'Selecting...' : 'Browse...'}</span>
          </button>

          <button
            type="submit"
            disabled={isScanning || !folderPath.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span>Scan Folder</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Quick shortcuts */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-slate-500 font-medium">Quick folders:</span>
          {['Downloads', 'Documents', 'Desktop', 'Pictures'].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleQuickSelect(`~/${name}`)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60 transition-colors font-medium cursor-pointer"
            >
              {name}
            </button>
          ))}
          {validationInfo && (
            <span className="text-[11px] text-emerald-700 font-medium ml-2">
              ✓ Selected: {validationInfo.name}
            </span>
          )}
        </div>

        {/* Scan Options */}
        <div className="flex items-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Scan subfolders recursively (Recommended: off for Downloads)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(e) => setIncludeHidden(e.target.checked)}
              className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Include hidden files</span>
          </label>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}
