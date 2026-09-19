/**
 * FLOWSHIELD: 2.5D Isometric & 2D Interactive Geospatial Grid Renderer
 * 
 * High-performance Canvas renderer featuring:
 * - 2.5D Isometric Projection with 3D volumetric elevation extrusion
 * - 2D GIS Top-Down orthographic mode
 * - Dynamic water depth volumetric layering & classification colors:
 *   - Emerald (#10b981): Safe (<0.25m)
 *   - Amber (#f59e0b): Warning (0.25m - 0.75m)
 *   - Crimson (#f43f5e): Critical (>=0.75m) with expanding sonar alert waves
 * - Real-time animated flow velocity vectors (magnitude & gradient direction)
 * - Critical infrastructure markers (Hospitals, Substations, Storm Pumps, Shelters)
 * - Temporary Sandbag Flood Barrier barricade rendering
 * - Camera pan, zoom, click-to-inspect, and barrier deployment interactions
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { GridNode } from '@/types/simulation';
import { GRID_WIDTH, GRID_HEIGHT } from '@/lib/simulation-engine/cityGrid';
import { MapControls } from './MapControls';
import { Legend } from './Legend';
import { 
  ShieldAlert, 
  Shield, 
  Activity, 
  Zap, 
  Users, 
  Compass, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const FloodMap2D5: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    grid,
    selectedCellId,
    selectCell,
    toggleCellBarrier,
    toggleCellDrainageBlock,
    toggleCellEvacuation,
  } = useFloodSimulation();

  const { mapSettings, playTacticalAlertSound } = useUIContext();

  // Camera Pan & Zoom Transform state
  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    zoom: 1.0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<GridNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Animation frame loop ticker for pulsing sonar rings and flow vectors
  const pulsePhaseRef = useRef<number>(0);

  // Selected cell object
  const selectedNode = grid.find(n => n.id === selectedCellId) || null;

  // Zoom handlers
  const handleZoomIn = () => setCamera(c => ({ ...c, zoom: Math.min(2.4, c.zoom + 0.2) }));
  const handleZoomOut = () => setCamera(c => ({ ...c, zoom: Math.max(0.6, c.zoom - 0.2) }));
  const handleResetView = () => setCamera({ x: 0, y: 0, zoom: 1.0 });

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setCamera(c => ({
      ...c,
      zoom: Math.min(2.6, Math.max(0.5, c.zoom + zoomDelta)),
    }));
  };

  // Drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    }
  };

  // Drag move & hit-testing
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCamera(c => ({
        ...c,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }

    if (!containerRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    // Hit-testing grid cell under cursor
    const detected = pickCellAtCoordinates(curX, curY);
    setHoveredCell(detected);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    const detected = pickCellAtCoordinates(curX, curY);

    if (detected) {
      selectCell(detected.id);
      playTacticalAlertSound('action');
    } else {
      selectCell(null);
    }
  };

  /**
   * Screen coordinate projection transformations
   */
  const projectCoordinates = useCallback(
    (gridX: number, gridY: number, elev: number, width: number, height: number) => {
      const centerX = width / 2 + camera.x;
      const is2D = mapSettings.projection === '2D';

      if (is2D) {
        // Orthographic GIS 2D Top-Down View
        const cellSize = 30 * camera.zoom;
        const totalW = GRID_WIDTH * cellSize;
        const totalH = GRID_HEIGHT * cellSize;
        const startX = centerX - totalW / 2;
        const startY = height / 2 + camera.y - totalH / 2;

        return {
          px: startX + gridX * cellSize + cellSize / 2,
          py: startY + gridY * cellSize + cellSize / 2,
          size: cellSize,
        };
      } else {
        // 2.5D Isometric Diamond Projection
        const tileW = 54 * camera.zoom;
        const tileH = 27 * camera.zoom;
        const elevScale = mapSettings.showElevationContours ? 2.4 * camera.zoom : 0;
        const startY = height / 2 + camera.y - (GRID_HEIGHT * tileH) / 3;

        const isoX = centerX + (gridX - gridY) * (tileW / 2);
        const isoY = startY + (gridX + gridY) * (tileH / 2) - elev * elevScale;

        return {
          px: isoX,
          py: isoY,
          tileW,
          tileH,
        };
      }
    },
    [camera, mapSettings.projection, mapSettings.showElevationContours]
  );

  /**
   * Cell Picking / Raycasting logic
   */
  const pickCellAtCoordinates = (screenX: number, screenY: number): GridNode | null => {
    if (!canvasRef.current) return null;
    const width = canvasRef.current.width / (window.devicePixelRatio || 1);
    const height = canvasRef.current.height / (window.devicePixelRatio || 1);
    const is2D = mapSettings.projection === '2D';

    let closestCell: GridNode | null = null;
    let minDistance = Infinity;

    for (const node of grid) {
      const proj = projectCoordinates(node.x, node.y, node.elevation, width, height);

      if (is2D) {
        const half = proj.size! / 2;
        if (
          screenX >= proj.px - half &&
          screenX <= proj.px + half &&
          screenY >= proj.py - half &&
          screenY <= proj.py + half
        ) {
          return node;
        }
      } else {
        const dx = screenX - proj.px;
        const dy = screenY - proj.py;
        // Diamond bounding metric: |dx| / (W/2) + |dy| / (H/2) <= 1
        const metric = Math.abs(dx) / (proj.tileW! / 2) + Math.abs(dy) / (proj.tileH! / 2);
        if (metric <= 1.05 && metric < minDistance) {
          minDistance = metric;
          closestCell = node;
        }
      }
    }

    return closestCell;
  };

  /**
   * Main Canvas Render Loop
   */
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      pulsePhaseRef.current = (pulsePhaseRef.current + 0.04) % (Math.PI * 2);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const width = rect.width;
      const height = rect.height;

      // Clear with dark tactical background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle command center grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let x = (camera.x % gridSpacing); x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = (camera.y % gridSpacing); y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const is2D = mapSettings.projection === '2D';

      // Sort cells for back-to-front painter's algorithm in 2.5D
      const sortedGrid = [...grid].sort((a, b) => {
        if (is2D) return 0;
        return (a.x + a.y) - (b.x + b.y);
      });

      // Render Each Cell
      for (const node of sortedGrid) {
        const isSelected = node.id === selectedCellId;
        const isHovered = node.id === hoveredCell?.id;
        const hasWater = node.currentWaterLevel > 0.02;

        const proj = projectCoordinates(node.x, node.y, node.elevation, width, height);

        // Color coding logic
        let baseFill = '#0f172a'; // Base terrain
        const borderStroke = 'rgba(51, 65, 85, 0.6)';

        // Elevation contour shading
        if (mapSettings.showElevationContours) {
          const elevNorm = Math.min(1, Math.max(0, (node.elevation - 1) / 35));
          const grey = Math.round(18 + elevNorm * 38);
          baseFill = `rgb(${grey}, ${grey + 4}, ${grey + 12})`;
        }

        // Water depth classification colors
        let waterFill = 'transparent';
        let waterStroke = 'transparent';

        if (mapSettings.showWaterDepthHeatmap && hasWater) {
          if (node.status === 'CRITICAL') {
            // Neon Crimson (#f43f5e)
            const alpha = Math.min(0.88, 0.55 + node.currentWaterLevel * 0.15);
            waterFill = `rgba(244, 63, 94, ${alpha})`;
            waterStroke = '#fb7185';
          } else if (node.status === 'WARNING') {
            // Warning Amber (#f59e0b)
            const alpha = Math.min(0.80, 0.45 + node.currentWaterLevel * 0.2);
            waterFill = `rgba(245, 158, 11, ${alpha})`;
            waterStroke = '#fcd34d';
          } else {
            // Safe Emerald (#10b981)
            const alpha = Math.min(0.70, 0.35 + node.currentWaterLevel * 0.3);
            waterFill = `rgba(16, 185, 129, ${alpha})`;
            waterStroke = '#6ee7b7';
          }
        }

        if (is2D) {
          // --- 2D Orthographic Render ---
          const size = proj.size!;
          const x = proj.px - size / 2;
          const y = proj.py - size / 2;

          ctx.fillStyle = baseFill;
          ctx.fillRect(x, y, size, size);

          if (hasWater && mapSettings.showWaterDepthHeatmap) {
            ctx.fillStyle = waterFill;
            ctx.fillRect(x, y, size, size);
            ctx.strokeStyle = waterStroke;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, size, size);
          } else {
            ctx.strokeStyle = borderStroke;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x, y, size, size);
          }

          // Active flood barrier indicator
          if (node.barrierActive) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
          }

          // Selected / Hovered outline
          if (isSelected) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
          } else if (isHovered) {
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, size, size);
          }
        } else {
          // --- 2.5D Isometric Volumetric Render ---
          const tw = proj.tileW!;
          const th = proj.tileH!;
          const cx = proj.px;
          const cy = proj.py;

          // Extrude 3D Base Block Downward
          const columnHeight = Math.max(6, node.elevation * 1.6 * camera.zoom);
          
          // Right extruded wall
          ctx.beginPath();
          ctx.moveTo(cx, cy + th / 2);
          ctx.lineTo(cx + tw / 2, cy);
          ctx.lineTo(cx + tw / 2, cy + columnHeight);
          ctx.lineTo(cx, cy + th / 2 + columnHeight);
          ctx.closePath();
          ctx.fillStyle = '#090d16';
          ctx.fill();
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.stroke();

          // Left extruded wall
          ctx.beginPath();
          ctx.moveTo(cx - tw / 2, cy);
          ctx.lineTo(cx, cy + th / 2);
          ctx.lineTo(cx, cy + th / 2 + columnHeight);
          ctx.lineTo(cx - tw / 2, cy + columnHeight);
          ctx.closePath();
          ctx.fillStyle = '#060911';
          ctx.fill();
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.stroke();

          // Top Isometric Diamond
          ctx.beginPath();
          ctx.moveTo(cx, cy - th / 2);
          ctx.lineTo(cx + tw / 2, cy);
          ctx.lineTo(cx, cy + th / 2);
          ctx.lineTo(cx - tw / 2, cy);
          ctx.closePath();
          ctx.fillStyle = baseFill;
          ctx.fill();
          ctx.strokeStyle = borderStroke;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Volumetric Water Layer
          if (hasWater && mapSettings.showWaterDepthHeatmap) {
            const waterExtrusion = Math.min(22, node.currentWaterLevel * 8 * camera.zoom);
            const wy = cy - waterExtrusion;

            // Water side wash
            if (waterExtrusion > 1) {
              ctx.beginPath();
              ctx.moveTo(cx, wy + th / 2);
              ctx.lineTo(cx + tw / 2, wy);
              ctx.lineTo(cx + tw / 2, cy);
              ctx.lineTo(cx, cy + th / 2);
              ctx.closePath();
              ctx.fillStyle = waterFill;
              ctx.fill();

              ctx.beginPath();
              ctx.moveTo(cx - tw / 2, wy);
              ctx.lineTo(cx, wy + th / 2);
              ctx.lineTo(cx, cy + th / 2);
              ctx.lineTo(cx - tw / 2, cy);
              ctx.closePath();
              ctx.fillStyle = waterFill;
              ctx.fill();
            }

            // Top water surface diamond
            ctx.beginPath();
            ctx.moveTo(cx, wy - th / 2);
            ctx.lineTo(cx + tw / 2, wy);
            ctx.lineTo(cx, wy + th / 2);
            ctx.lineTo(cx - tw / 2, wy);
            ctx.closePath();
            ctx.fillStyle = waterFill;
            ctx.fill();
            ctx.strokeStyle = waterStroke;
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Temporary Barrier Walls
          if (node.barrierActive) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - th / 2 - 6);
            ctx.lineTo(cx + tw / 2, cy - 6);
            ctx.lineTo(cx, cy + th / 2 - 6);
            ctx.lineTo(cx - tw / 2, cy - 6);
            ctx.closePath();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Selected / Hovered highlight rings
          if (isSelected) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - th / 2 - 2);
            ctx.lineTo(cx + tw / 2 + 3, cy);
            ctx.lineTo(cx, cy + th / 2 + 2);
            ctx.lineTo(cx - tw / 2 - 3, cy);
            ctx.closePath();
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          } else if (isHovered) {
            ctx.beginPath();
            ctx.moveTo(cx, cy - th / 2);
            ctx.lineTo(cx + tw / 2, cy);
            ctx.lineTo(cx, cy + th / 2);
            ctx.lineTo(cx - tw / 2, cy);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        // --- Render Flow Vectors ---
        if (mapSettings.showFlowVectors && node.flowVector.speed > 0.08) {
          const spd = node.flowVector.speed;
          const arrowLen = Math.min(18, Math.max(6, spd * 12 * camera.zoom));
          const angle = Math.atan2(node.flowVector.vy, node.flowVector.vx);

          const cx = proj.px;
          const cy = proj.py;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angle);

          ctx.beginPath();
          ctx.moveTo(-arrowLen / 2, 0);
          ctx.lineTo(arrowLen / 2, 0);
          ctx.lineTo(arrowLen / 2 - 3, -2.5);
          ctx.moveTo(arrowLen / 2, 0);
          ctx.lineTo(arrowLen / 2 - 3, 2.5);

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // --- Render Critical Alert Sonar Rings ---
        if (mapSettings.showCriticalAlertPulses && node.status === 'CRITICAL') {
          const pulseR = 12 + Math.sin(pulsePhaseRef.current) * 8;
          ctx.save();
          ctx.beginPath();
          ctx.arc(proj.px, proj.py, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.restore();
        }

        // --- Infrastructure Markers ---
        if (mapSettings.showInfrastructureMarkers && node.infrastructure) {
          ctx.save();
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const markY = proj.py - (is2D ? 0 : 6);

          if (node.infrastructure === 'hospital') {
            ctx.fillStyle = '#f43f5e';
            ctx.fillText('🏥', proj.px, markY);
          } else if (node.infrastructure === 'substation') {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('⚡', proj.px, markY);
          } else if (node.infrastructure === 'shelter') {
            ctx.fillStyle = '#10b981';
            ctx.fillText('🛡️', proj.px, markY);
          } else if (node.infrastructure === 'pumping_station') {
            ctx.fillStyle = node.drainBlocked ? '#ef4444' : '#06b6d4';
            ctx.fillText('🌀', proj.px, markY);
          }
          ctx.restore();
        }

        // Drain blocked warning icon
        if (node.drainBlocked) {
          ctx.save();
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🚫', proj.px + 8, proj.py - 8);
          ctx.restore();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    grid,
    camera,
    mapSettings,
    selectedCellId,
    hoveredCell,
    projectCoordinates,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full min-h-[480px] bg-slate-950 select-none overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      />

      {/* Map Control Toolbar */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
      />

      {/* Visual Legend */}
      <Legend />

      {/* Real-time Cell Hover Tooltip */}
      {hoveredCell && !selectedNode && (
        <div
          className="pointer-events-none fixed z-30 flex flex-col gap-1 rounded border border-slate-700/80 bg-slate-950/90 p-2 text-xs shadow-2xl backdrop-blur-md"
          style={{
            left: `${mousePos.x + 16}px`,
            top: `${mousePos.y + 16}px`,
            transform: 'translate(0, 0)',
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 font-semibold text-slate-200">
            <span>{hoveredCell.name}</span>
            <Badge
              size="xs"
              variant={
                hoveredCell.status === 'CRITICAL'
                  ? 'critical'
                  : hoveredCell.status === 'WARNING'
                  ? 'warning'
                  : 'safe'
              }
            >
              {hoveredCell.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
            <div>Water Depth: <span className="font-mono text-cyan-300">{hoveredCell.currentWaterLevel.toFixed(2)}m</span></div>
            <div>Elevation: <span className="font-mono text-slate-400">{hoveredCell.elevation.toFixed(1)}m</span></div>
            <div>Pop. Density: <span className="font-mono text-slate-400">{hoveredCell.population.toLocaleString()}</span></div>
            <div>Flow Speed: <span className="font-mono text-blue-300">{hoveredCell.flowVector.speed.toFixed(2)} m/s</span></div>
            {hoveredCell.timeToCriticalMinutes !== null && (
              <div className="col-span-2 text-rose-400 font-bold">
                Time to Critical: {hoveredCell.timeToCriticalMinutes} mins
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clicked / Selected Cell Inspector Floating HUD */}
      {selectedNode && (
        <div className="absolute top-4 left-4 z-20 w-80 rounded-xl border border-cyan-500/40 bg-slate-950/92 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 flex items-center gap-1">
                <Compass className="h-3 w-3" /> Sector Telemetry HUD
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">{selectedNode.name}</h4>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectCell(null);
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5 text-xs">
            {/* Alert Status Banner */}
            <div className="flex items-center justify-between rounded-md bg-slate-900/80 p-2 border border-slate-800">
              <span className="text-slate-400 font-medium">Inundation Alert:</span>
              <Badge
                variant={
                  selectedNode.status === 'CRITICAL'
                    ? 'critical'
                    : selectedNode.status === 'WARNING'
                    ? 'warning'
                    : 'safe'
                }
              >
                {selectedNode.status}
              </Badge>
            </div>

            {/* Time to Critical Condition Indicator */}
            {selectedNode.timeToCriticalMinutes !== null && (
              <div className="rounded-md bg-rose-950/40 p-2 border border-rose-500/40 text-rose-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Activity className="h-4 w-4 text-rose-400 animate-pulse" />
                  Time to Critical:
                </span>
                <span className="font-mono text-base font-bold text-rose-200">
                  {selectedNode.timeToCriticalMinutes === 0
                    ? 'BREACHED'
                    : `${selectedNode.timeToCriticalMinutes} MIN`}
                </span>
              </div>
            )}

            {/* Metric Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded bg-slate-900/60 p-2 border border-slate-800/70">
                <span className="text-slate-400 block text-[10px]">Water Depth</span>
                <span className="font-mono text-base font-bold text-cyan-300">
                  {selectedNode.currentWaterLevel.toFixed(2)}m
                </span>
              </div>
              <div className="rounded bg-slate-900/60 p-2 border border-slate-800/70">
                <span className="text-slate-400 block text-[10px]">Base Elevation</span>
                <span className="font-mono text-base font-bold text-slate-300">
                  {selectedNode.elevation.toFixed(1)}m
                </span>
              </div>
              <div className="rounded bg-slate-900/60 p-2 border border-slate-800/70">
                <span className="text-slate-400 block text-[10px]">Population Density</span>
                <span className="font-mono text-sm font-semibold text-slate-200">
                  {selectedNode.population.toLocaleString()}
                </span>
              </div>
              <div className="rounded bg-slate-900/60 p-2 border border-slate-800/70">
                <span className="text-slate-400 block text-[10px]">Drainage Outflow</span>
                <span className="font-mono text-sm font-semibold text-emerald-300">
                  {selectedNode.effectiveDrainage} m³/s
                </span>
              </div>
            </div>

            {/* Infrastructure Details */}
            {selectedNode.infrastructure && (
              <div className="rounded bg-purple-950/30 p-2 border border-purple-500/30 text-purple-200 text-[11px] flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400 shrink-0" />
                <div>
                  <span className="font-bold block">{selectedNode.infrastructureName}</span>
                  <span className="text-[10px] text-purple-300/80 uppercase tracking-wider">
                    High Priority Strategic Asset
                  </span>
                </div>
              </div>
            )}

            {/* Emergency Action Buttons */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
              <Button
                size="sm"
                variant={selectedNode.barrierActive ? 'cyan' : 'outline'}
                onClick={() => toggleCellBarrier(selectedNode.id)}
                className="w-full justify-between text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  {selectedNode.barrierActive ? 'Barrier Deployed (+1.0m)' : 'Deploy Flood Barrier'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedNode.barrierActive ? 'ACTIVE' : 'READY'}
                </span>
              </Button>

              <Button
                size="sm"
                variant={selectedNode.drainBlocked ? 'destructive' : 'outline'}
                onClick={() => toggleCellDrainageBlock(selectedNode.id)}
                className="w-full justify-between text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {selectedNode.drainBlocked ? 'Clear Culvert Blockage' : 'Simulate Drain Blockage'}
                </span>
                <span className="text-[10px] font-mono">
                  {selectedNode.drainBlocked ? 'BLOCKED' : 'CLEAR'}
                </span>
              </Button>

              <Button
                size="sm"
                variant={selectedNode.evacuationOrdered ? 'destructive' : 'secondary'}
                onClick={() => toggleCellEvacuation(selectedNode.id)}
                className="w-full justify-between text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {selectedNode.evacuationOrdered ? 'Evacuation In Progress' : 'Issue Evacuation Order'}
                </span>
                <span className="text-[10px] font-mono">
                  {selectedNode.evacuationOrdered ? 'EVAC' : 'STANDBY'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
