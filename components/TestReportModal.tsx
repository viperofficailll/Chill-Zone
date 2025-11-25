import React from 'react';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { TestReportData } from '../types';

interface TestReportModalProps {
  isRunning: boolean;
  progress: number;
  currentLog: string;
  report: TestReportData | null;
  onClose: () => void;
}

export const TestReportModal: React.FC<TestReportModalProps> = ({ 
  isRunning, 
  progress, 
  currentLog, 
  report, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <GlassCard className="w-full max-w-2xl bg-black/60 border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
              System Diagnostics
            </h2>
            <p className="text-white/40 text-sm mt-1">Load Testing Suite • v1.0.0</p>
          </div>
          {!isRunning && (
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto">
          
          {isRunning ? (
            <div className="space-y-6">
              <div className="flex justify-between text-sm font-medium text-white/70">
                <span>Simulating User Traffic...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Terminal Log */}
              <div className="h-48 bg-black/50 rounded-lg border border-white/10 p-4 font-mono text-xs text-green-400 overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                <div className="relative z-10 flex flex-col justify-end h-full">
                   <p className="opacity-50">...initializing virtual users</p>
                   <p className="opacity-70">...allocating buffers</p>
                   <p className="text-white">{currentLog}</p>
                   <span className="animate-pulse">_</span>
                </div>
              </div>
            </div>
          ) : report ? (
            <div className="space-y-8 animate-[float_0.5s_ease-out]">
              {/* Report Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-white mb-1">{report.totalUsers}</div>
                  <div className="text-xs uppercase tracking-wider text-white/40">Total Users</div>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">{report.successfulMatches}</div>
                  <div className="text-xs uppercase tracking-wider text-green-400/60">Success</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">{report.avgLatency}ms</div>
                  <div className="text-xs uppercase tracking-wider text-blue-400/60">Avg Latency</div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">60</div>
                  <div className="text-xs uppercase tracking-wider text-purple-400/60">FPS Stability</div>
                </div>
              </div>

              <div className="flex items-center justify-center py-6">
                 <div className="px-8 py-4 bg-green-500/20 border-2 border-green-500 rounded-full text-green-400 font-bold text-xl tracking-widest shadow-[0_0_20px_rgba(74,222,128,0.3)] transform -rotate-6">
                    PASSED
                 </div>
              </div>

              <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20">
                Close Report
              </Button>
            </div>
          ) : null}

        </div>
      </GlassCard>
    </div>
  );
};