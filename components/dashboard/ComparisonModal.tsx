/**
 * HYDRO MATRIX: Scenario Comparison Modal & Analysis Matrix
 * 
 * Provides side-by-side behavioral analysis across multiple crisis scenarios:
 * - Peak Inundated Land Area (km²)
 * - Vulnerable Demographic Exposure
 * - Maximum Surface Water Depth
 * - Time to First Critical Condition
 * - Recharts multi-line comparative telemetry curves
 */

'use client';

import React, { useState } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  X,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { formatPopulation } from '@/lib/utils';

export const ComparisonModal: React.FC = () => {
  const { comparisonData, loadScenario, activeScenarioId } = useFloodSimulation();
  const { activeModal, setActiveModal, playTacticalAlertSound } = useUIContext();

  const [activeTab, setActiveTab] = useState<'area' | 'population' | 'depth'>('area');

  if (activeModal !== 'comparison') return null;

  // Colors for each scenario line
  const scenarioColors: Record<string, string> = {
    'normal-rain': '#10b981',      // Emerald
    'heavy-cloudburst': '#f59e0b',  // Amber
    'drainage-failure': '#f43f5e',  // Crimson
    'blocked-channel': '#a855f7',   // Purple
    'typhoon-surge': '#06b6d4',     // Cyan
  };

  // Merge comparative timeseries points for multi-line Recharts
  const mergedTimeline: Array<{
    timeLabel: string;
    [key: string]: number | string;
  }> = [];

  if (comparisonData.length > 0 && comparisonData[0].dataPoints) {
    const pointCount = comparisonData[0].dataPoints.length;
    for (let i = 0; i < pointCount; i++) {
      const row: { timeLabel: string; [key: string]: number | string } = {
        timeLabel: comparisonData[0].dataPoints[i].timeLabel,
      };

      for (const record of comparisonData) {
        if (record.dataPoints[i]) {
          if (activeTab === 'area') {
            row[record.scenarioName] = record.dataPoints[i].floodedAreaSqKm;
          } else if (activeTab === 'population') {
            row[record.scenarioName] = record.dataPoints[i].affectedPopulation;
          } else {
            row[record.scenarioName] = record.dataPoints[i].maxWaterDepth;
          }
        }
      }
      mergedTimeline.push(row);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Scenario Comparison & Behavioral Matrix
                <Badge variant="cyan" className="text-[10px]">
                  5 SCENARIOS EVALUATED
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Comparative hydrological telemetry across baseline and disaster-injected profiles
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Comparative Summary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {comparisonData.map((rec) => {
              const isCurrent = activeScenarioId === rec.scenarioId;
              const col = scenarioColors[rec.scenarioId] || '#38bdf8';

              return (
                <div
                  key={rec.scenarioId}
                  className={`flex flex-col justify-between rounded-xl p-3 border transition-all ${
                    isCurrent
                      ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col }} />
                      {isCurrent && (
                        <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{rec.scenarioName}</h4>

                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Peak Flooded:</span>
                        <strong className="font-mono text-white">{rec.peakFloodedAreaSqKm} km²</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Peak Pop. at Risk:</span>
                        <strong className="font-mono text-amber-300">{formatPopulation(rec.peakAffectedPopulation)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Peak Depth:</span>
                        <strong className="font-mono text-cyan-300">{rec.peakWaterDepth}m</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Time to Critical:</span>
                        <strong className="font-mono text-rose-400">
                          {rec.timeToFirstCriticalMin !== null ? `${rec.timeToFirstCriticalMin}m` : 'NONE'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="xs"
                    variant={isCurrent ? 'cyan' : 'outline'}
                    onClick={() => {
                      loadScenario(rec.scenarioId);
                      setActiveModal('none');
                      playTacticalAlertSound('action');
                    }}
                    className="mt-3 w-full text-[10px]"
                  >
                    {isCurrent ? 'Simulating Now' : 'Load Scenario'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Comparative Graphs Tabs */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Comparative Dynamics Curve
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
                <button
                  onClick={() => setActiveTab('area')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'area'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Flooded Area (km²)
                </button>
                <button
                  onClick={() => setActiveTab('population')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'population'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Impacted Population
                </button>
                <button
                  onClick={() => setActiveTab('depth')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    activeTab === 'depth'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Max Water Depth (m)
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mergedTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#030712',
                      borderColor: '#334155',
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {comparisonData.map((rec) => (
                    <Line
                      key={rec.scenarioId}
                      type="monotone"
                      dataKey={rec.scenarioName}
                      stroke={scenarioColors[rec.scenarioId] || '#38bdf8'}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
          <span>* Simulations calculated via 2D Shallow Water Diffusive Wave Momentum models.</span>
          <Button size="sm" variant="default" onClick={() => setActiveModal('none')}>
            Close Matrix
          </Button>
        </div>
      </div>
    </div>
  );
};
