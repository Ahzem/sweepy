'use client';

import React from 'react';
import { Bot, Server, Shield, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { AIStatus } from '@/types';

interface SettingsViewProps {
  aiStatus: AIStatus | null;
  backendOnline: boolean;
  onRefresh: () => void;
  isChecking: boolean;
}

export function SettingsView({ aiStatus, backendOnline, onRefresh, isChecking }: SettingsViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System & AI Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Verify local model readiness and check connection parameters.
        </p>
      </div>

      {/* Ollama Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Ollama Local AI</h3>
              <p className="text-xs text-slate-500">Configured model: <code className="font-mono font-semibold text-slate-800">gemma3:1b</code></p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Ollama Server</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${aiStatus?.connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-sm font-semibold text-slate-900">
                {aiStatus?.connected ? 'Running (http://localhost:11434)' : 'Unreachable'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">Model Availability</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${aiStatus?.model_available ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-semibold text-slate-900">
                {aiStatus?.model_available ? 'gemma3:1b Installed' : 'Model Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* Setup command helper */}
        {(!aiStatus?.connected || !aiStatus?.model_available) && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>How to setup Gemma 3 1B locally:</span>
            </div>
            <p className="text-amber-700">
              Sweepy automatically uses deterministic rule-based sorting if Ollama is not running. To enable AI-powered organization suggestions, run:
            </p>
            <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono rounded-lg flex items-center justify-between">
              <code>ollama pull gemma3:1b</code>
            </div>
          </div>
        )}
      </div>

      {/* Backend API Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">FastAPI Backend</h3>
            <p className="text-xs text-slate-500">Service endpoint: <code className="font-mono text-slate-800">http://127.0.0.1:8000</code></p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">FastAPI Service Status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-sm font-semibold text-slate-900">
                {backendOnline ? 'Connected & Operational' : 'Backend Disconnected'}
              </span>
            </div>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Open Swagger Docs
          </a>
        </div>
      </div>

      {/* Privacy Guarantees */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Privacy & Safety Guarantees</h3>
            <p className="text-xs text-slate-500">Designed from the ground up for zero cloud dependency.</p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600 pt-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Never Deletes:</strong> Sweepy performs moves/renames only. Deletion logic does not exist in the codebase.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Local Inference:</strong> Prompts are sent solely to your local Ollama instance at 127.0.0.1:11434.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Filesystem Confinement:</strong> Paths are rigorously validated against directory traversal and symlink escapes.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>1-Click Undo:</strong> File movements are logged locally to allow full reversal at any time.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
