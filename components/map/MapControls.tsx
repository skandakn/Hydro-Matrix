import React from 'react';
import { useUIContext } from '@/context/UIContext';
import { Button } from '@/components/ui/button';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Navigation2,
  Activity,
  Waves,
  Eye,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Tent,
} from 'lucide-react';

export const MapControls: React.FC = () => {
  const {
    mapSettings,
    toggleLayer,
    setProjection,
    audioAlertsEnabled,
    toggleAudioAlerts,
    updateMapSettings,
  } = useUIContext();

  const handleZoomIn = () => updateMapSettings({ zoom: Math.min(2.4, (mapSettings.zoom || 1.0) + 0.2) });
  const handleZoomOut = () => updateMapSettings({ zoom: Math.max(0.6, (mapSettings.zoom || 1.0) - 0.2) });
  const handleResetView = () => updateMapSettings({ zoom: 1.0 });

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
      {/* 2.5D vs 2D Perspective Toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/85 p-1 shadow-xl backdrop-blur-md">
        <Button
          size="xs"
          variant={mapSettings.projection === '2.5D' ? 'default' : 'ghost'}
          onClick={() => setProjection('2.5D')}
          className="gap-1 text-xs"
        >
          <Compass className="h-3.5 w-3.5" />
          2.5D ISO
        </Button>
        <Button
          size="xs"
          variant={mapSettings.projection === '2D' ? 'default' : 'ghost'}
          onClick={() => setProjection('2D')}
          className="gap-1 text-xs"
        >
          <Navigation2 className="h-3.5 w-3.5" />
          2D TOP
        </Button>
      </div>

      {/* Layer Visibility Toggles */}
      <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/85 p-1.5 shadow-xl backdrop-blur-md text-xs">
        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Guwahati Layers</span>
          <Layers className="h-3 w-3 text-cyan-400" />
        </div>

        {/* 5 Primary Channels Overlay */}
        <button
          type="button"
          onClick={() => toggleLayer('showPrimaryChannels')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showPrimaryChannels
              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5 text-cyan-400" />
            5 Primary Channels
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showPrimaryChannels ? 'text-cyan-400' : 'text-slate-600'}`} />
        </button>

        {/* 18 AWS Stations Overlay */}
        <button
          type="button"
          onClick={() => toggleLayer('showWeatherStations')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showWeatherStations
              ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-amber-400" />
            18 AWS Stations
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showWeatherStations ? 'text-amber-400' : 'text-slate-600'}`} />
        </button>

        {/* 20 GMDA Pumps Overlay */}
        <button
          type="button"
          onClick={() => toggleLayer('showDrainagePumps')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showDrainagePumps
              ? 'bg-blue-950/70 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-blue-400" />
            20 GMDA Pumps
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showDrainagePumps ? 'text-blue-400' : 'text-slate-600'}`} />
        </button>

        {/* Rescue Camps Overlay */}
        <button
          type="button"
          onClick={() => toggleLayer('showRescueCamps')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showRescueCamps
              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Tent className="h-3.5 w-3.5 text-emerald-400" />
            Rescue Camps (⛺)
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showRescueCamps ? 'text-emerald-400' : 'text-slate-600'}`} />
        </button>

        {/* Water Depth Heatmap */}
        <button
          type="button"
          onClick={() => toggleLayer('showWaterDepthHeatmap')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showWaterDepthHeatmap
              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Waves className="h-3.5 w-3.5 text-cyan-400" />
            Inundation Heatmap
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showWaterDepthHeatmap ? 'text-cyan-400' : 'text-slate-600'}`} />
        </button>

        {/* Flow Vectors */}
        <button
          type="button"
          onClick={() => toggleLayer('showFlowVectors')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showFlowVectors
              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Navigation2 className="h-3.5 w-3.5 text-blue-400 rotate-45" />
            Flow Vectors
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showFlowVectors ? 'text-cyan-400' : 'text-slate-600'}`} />
        </button>

        {/* Critical Alert Pulses */}
        <button
          type="button"
          onClick={() => toggleLayer('showCriticalAlertPulses')}
          className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors ${
            mapSettings.showCriticalAlertPulses
              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
            Critical Sonar Pulses
          </span>
          <Eye className={`h-3 w-3 ${mapSettings.showCriticalAlertPulses ? 'text-rose-400' : 'text-slate-600'}`} />
        </button>
      </div>

      {/* Camera & Audio Controls */}
      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/85 p-1 shadow-xl backdrop-blur-md">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-3.5 w-3.5 text-slate-300" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-3.5 w-3.5 text-slate-300" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleResetView} title="Reset Camera">
          <RotateCcw className="h-3.5 w-3.5 text-slate-300" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={toggleAudioAlerts}
          title={audioAlertsEnabled ? 'Mute Alert Sirens' : 'Enable Alert Sirens'}
        >
          {audioAlertsEnabled ? (
            <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-slate-500" />
          )}
        </Button>
      </div>
    </div>
  );
};
