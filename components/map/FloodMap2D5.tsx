/**
 * HYDRO MATRIX: 2.5D Isometric & 2D Interactive Geospatial Grid Renderer
 * Localization: Guwahati — Bahini/Bharalu Basin
 * 
 * Features:
 * - 2.5D Isometric Projection with 3D volumetric elevation extrusion
 * - 2D GIS Top-Down orthographic mode
 * - Government-recognized primary drainage channels visual overlays:
 *   1. Bharalu River (ভৰলু)
 *   2. Mora Bharalu (মৰা ভৰলু)
 *   3. Basistha River (বশিষ্ঠ)
 *   4. Bahini River (বাহিনী)
 *   5. Lakhimijan Channel (লাখিমীজান)
 *   Plus Brahmaputra River northern receiving boundary
 * - 18 Automatic Weather Stations (AWS) live sensor beacon overlays
 * - 20 GMDA Auto-Priming Dewatering Pumps with real-time operational status
 * - Camera pan, zoom, click-to-inspect, and emergency defense dispatch
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFloodSimulation } from '@/hooks/useFloodSimulation';
import { useUIContext } from '@/context/UIContext';
import { GridNode, RescueCamp } from '@/types/simulation';
import { GRID_WIDTH, GRID_HEIGHT, RECOGNIZED_CHANNELS } from '@/lib/simulation-engine/cityGrid';
import { getNearestSafeCamp } from '@/lib/simulation-engine/rescueCampEngine';
import { MapControls } from './MapControls';
import { Legend } from './Legend';
import { 
  Shield, 
  Activity, 
  Users, 
  Compass, 
  X,
  Radio,
  Cpu,
  Tent,
  MoveRight,
  Plus,
  RotateCcw,
  Sparkles,
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
    toggleCellEvacuation,
    weatherStations,
    gmdaPumps,
    toggleGMDAPump,
    rescueCamps,
    deployRescueCamp,
    evacuateResidentsToCamp,
  } = useFloodSimulation();

  const { mapSettings, playTacticalAlertSound, setActiveModal } = useUIContext();

  // Viewport camera scale and pan offsets state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom((z) => Math.min(Number((z + 0.2).toFixed(2)), 2.5));
  };
  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom((z) => Math.max(Number((z - 0.2).toFixed(2)), 0.6));
  };
  const handleResetZoom = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<GridNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const pulsePhaseRef = useRef<number>(0);

  // Selected cell object (handles 2D grid array)
  const flatCells = Array.isArray(grid[0]) ? (grid as unknown as GridNode[][]).flat() : (grid as unknown as GridNode[]);
  const selectedNode = flatCells.find(n => n.id === selectedCellId) || null;
  const selectedAWS = selectedNode?.awsStationId
    ? weatherStations.find(w => w.id === selectedNode.awsStationId)
    : null;
  const selectedPump = selectedNode?.gmdaPumpId
    ? gmdaPumps.find(p => p.id === selectedNode.gmdaPumpId)
    : null;
  const selectedCamp = selectedNode
    ? rescueCamps.find(c => c.gridX === selectedNode.x && c.gridY === selectedNode.y)
    : null;
  const nearestCampInfo = selectedNode && !selectedCamp
    ? getNearestSafeCamp(selectedNode, rescueCamps)
    : null;
  const isHighGroundCandidate = selectedNode && !selectedCamp && selectedNode.elevation >= 51.5 && selectedNode.currentWaterLevel <= 0.05 && selectedNode.y > 1;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(Number((z + 0.2).toFixed(2)), 2.5));
    } else {
      setZoom((z) => Math.max(Number((z - 0.2).toFixed(2)), 0.6));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (!containerRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

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
      // In camera-transformed space (ctx.scale(zoom, zoom)), dimensions are scaled by zoom
      const worldWidth = width / zoom;
      const worldHeight = height / zoom;
      const centerX = worldWidth / 2;
      const is2D = mapSettings.projection === '2D';

      if (is2D) {
        // Orthographic GIS 2D Top-Down View
        const cellSize = 30;
        const totalW = GRID_WIDTH * cellSize;
        const totalH = GRID_HEIGHT * cellSize;
        const startX = centerX - totalW / 2;
        const startY = worldHeight / 2 - totalH / 2;

        return {
          px: startX + gridX * cellSize + cellSize / 2,
          py: startY + gridY * cellSize + cellSize / 2,
          size: cellSize,
        };
      } else {
        // 2.5D Isometric Diamond Projection
        const tileW = 54;
        const tileH = 27;
        const elevScale = mapSettings.showElevationContours ? 1.8 : 0;
        const startY = worldHeight / 2 - (GRID_HEIGHT * tileH) / 3;

        // Relative elevation normalized from MSL datum ~48m
        const relElev = Math.max(0, elev - 48.0);
        const isoX = centerX + (gridX - gridY) * (tileW / 2);
        const isoY = startY + (gridX + gridY) * (tileH / 2) - relElev * elevScale;

        return {
          px: isoX,
          py: isoY,
          tileW,
          tileH,
        };
      }
    },
    [zoom, mapSettings.projection, mapSettings.showElevationContours]
  );

  const pickCellAtCoordinates = (screenX: number, screenY: number): GridNode | null => {
    if (!canvasRef.current) return null;
    const width = canvasRef.current.width / (window.devicePixelRatio || 1);
    const height = canvasRef.current.height / (window.devicePixelRatio || 1);
    const is2D = mapSettings.projection === '2D';

    // Map screen mouse coordinates to transformed world coordinates
    const worldX = (screenX - pan.x) / zoom;
    const worldY = (screenY - pan.y) / zoom;

    let closestCell: GridNode | null = null;
    let minDistance = Infinity;

    for (const node of flatCells) {
      const proj = projectCoordinates(node.x, node.y, node.elevation, width, height);

      if (is2D) {
        const half = proj.size! / 2;
        if (
          worldX >= proj.px - half &&
          worldX <= proj.px + half &&
          worldY >= proj.py - half &&
          worldY <= proj.py + half
        ) {
          return node;
        }
      } else {
        const dx = worldX - proj.px;
        const dy = worldY - proj.py;
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

      // Dark tactical background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Subtle command grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let x = (pan.x % gridSpacing); x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = (pan.y % gridSpacing); y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Apply viewport camera scale and pan offsets to canvas rendering context
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const is2D = mapSettings.projection === '2D';

      // Read current live grid from store on every animation frame (handles 2D grid)
      const currentGridState = useFloodSimulation.getState().grid;
      const currentCells = Array.isArray(currentGridState[0])
        ? (currentGridState as unknown as GridNode[][]).flat()
        : (currentGridState as unknown as GridNode[]);

      // Sort cells back-to-front
      const sortedGrid = [...currentCells].sort((a, b) => {
        if (is2D) return 0;
        return (a.x + a.y) - (b.x + b.y);
      });

      // Render Each Cell
      for (const node of sortedGrid) {
        const isSelected = node.id === selectedCellId;
        const isHovered = node.id === hoveredCell?.id;
        const depth = node.waterDepth ?? node.currentWaterLevel ?? 0;
        const hasWater = depth > 0.02;

        const proj = projectCoordinates(node.x, node.y, node.elevation, width, height);

        let baseFill = '#0f172a';
        const borderStroke = 'rgba(51, 65, 85, 0.6)';

        // Shading based on elevation
        if (mapSettings.showElevationContours) {
          const relElev = Math.max(0, node.elevation - 48.0);
          const elevNorm = Math.min(1, relElev / 40);
          const grey = Math.round(18 + elevNorm * 42);
          baseFill = `rgb(${grey}, ${grey + 4}, ${grey + 14})`;
        }

        // Highlight Government-Recognized Primary Drainage Channels
        if (mapSettings.showPrimaryChannels && node.channel) {
          const chMeta = RECOGNIZED_CHANNELS[node.channel];
          if (chMeta) {
            baseFill = `${chMeta.color}22`; // Translucent tint matching channel color
          }
        }

        // Bidirectional water depth classification colors: Critical (>0.75m: crimson), Warning (0.25-0.75m: amber), Safe (<0.25m: emerald)
        let waterFill = 'transparent';
        let waterStroke = 'transparent';

        if (mapSettings.showWaterDepthHeatmap && hasWater) {
          if (depth >= 0.75) {
            const alpha = Math.min(0.90, 0.55 + depth * 0.15);
            waterFill = `rgba(244, 63, 94, ${alpha})`;
            waterStroke = '#fb7185';
          } else if (depth >= 0.25) {
            const alpha = Math.min(0.82, 0.45 + depth * 0.2);
            waterFill = `rgba(245, 158, 11, ${alpha})`;
            waterStroke = '#fcd34d';
          } else {
            const alpha = Math.min(0.70, 0.35 + depth * 0.3);
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

          // Channel Border Glow
          if (mapSettings.showPrimaryChannels && node.channel) {
            const chMeta = RECOGNIZED_CHANNELS[node.channel];
            ctx.strokeStyle = chMeta.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, size, size);
          }

          if (node.barrierActive) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
          }

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

          const relElev = Math.max(0, node.elevation - 48.0);
          const columnHeight = Math.max(6, relElev * 1.6);

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

          // Primary Channel Outline
          if (mapSettings.showPrimaryChannels && node.channel) {
            const chMeta = RECOGNIZED_CHANNELS[node.channel];
            ctx.strokeStyle = chMeta.color;
            ctx.lineWidth = 1.8;
          } else {
            ctx.strokeStyle = borderStroke;
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();

          // Volumetric Water Layer (extrude height proportional to waterDepth)
          if (hasWater && mapSettings.showWaterDepthHeatmap) {
            const waterExtrusion = Math.min(32, Math.max(1, depth * 14));
            const wy = cy - waterExtrusion;

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

        // --- Flow Vectors ---
        if (mapSettings.showFlowVectors && node.flowVector.speed > 0.08) {
          const spd = node.flowVector.speed;
          const arrowLen = Math.min(18, Math.max(6, spd * 12));
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

        // --- Critical Alert Sonar Rings ---
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

        // --- Hardware: 20 GMDA Auto-Priming Dewatering Pumps ---
        if (mapSettings.showDrainagePumps && node.gmdaPumpId) {
          const pump = gmdaPumps.find(p => p.id === node.gmdaPumpId);
          const isFailed = pump?.status === 'FAILED' || pump?.status === 'OFFLINE';

          ctx.save();
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const markY = proj.py - (is2D ? 0 : 5);

          if (isFailed) {
            ctx.fillText('🚫', proj.px, markY);
          } else {
            ctx.fillText('🌀', proj.px, markY);
          }
          ctx.restore();
        }

        // --- Hardware: 18 Automatic Weather Stations (AWS) ---
        if (mapSettings.showWeatherStations && node.awsStationId) {
          ctx.save();
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const markY = proj.py + (is2D ? 0 : 4);
          ctx.fillText('📡', proj.px, markY);
          ctx.restore();
        }

        // --- Infrastructure Markers ---
        if (mapSettings.showInfrastructureMarkers && node.infrastructure) {
          ctx.save();
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const markY = proj.py - (is2D ? 0 : 8);

          if (node.infrastructure === 'hospital') {
            ctx.fillText('🏥', proj.px, markY);
          } else if (node.infrastructure === 'government') {
            ctx.fillText('🏛️', proj.px, markY);
          } else if (node.infrastructure === 'shelter') {
            ctx.fillText('🛡️', proj.px, markY);
          } else if (node.infrastructure === 'wetland') {
            ctx.fillText('🌿', proj.px, markY);
          }
          ctx.restore();
        }

        // --- Evacuation Transit Corridors to Nearest Rescue Camp ---
        if (mapSettings.showRescueCamps && (node.status === 'CRITICAL' || node.status === 'WARNING') && rescueCamps.length > 0) {
          let closestCamp: RescueCamp | null = null;
          let minD = Infinity;
          for (const c of rescueCamps) {
            if (c.status === 'OPERATIONAL' || c.status === 'NEAR_CAPACITY') {
              const d = Math.hypot(node.x - c.gridX, node.y - c.gridY);
              if (d < minD) {
                minD = d;
                closestCamp = c;
              }
            }
          }
          if (closestCamp && minD <= 6) {
            const destProj = projectCoordinates(
              closestCamp.gridX,
              closestCamp.gridY,
              closestCamp.elevationMeters,
              width,
              height
            );
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(proj.px, proj.py);
            ctx.lineTo(destProj.px, destProj.py);
            ctx.strokeStyle = node.status === 'CRITICAL' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(52, 211, 153, 0.28)';
            ctx.lineWidth = 1.3;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.restore();
          }
        }

        // --- Tactical Rescue Camp Markers & Safety Radar Perimeter ---
        if (mapSettings.showRescueCamps) {
          const campAtNode = rescueCamps.find(c => c.gridX === node.x && c.gridY === node.y);
          if (campAtNode) {
            const isCompromised = campAtNode.status === 'COMPROMISED';
            const isRisk = campAtNode.status === 'AT_RISK_FLOODING';
            const radarR = 15 + Math.sin(pulsePhaseRef.current * 1.5) * 5;

            ctx.save();
            // Pulsating radar perimeter
            ctx.beginPath();
            ctx.arc(proj.px, proj.py, radarR, 0, Math.PI * 2);
            ctx.strokeStyle = isCompromised
              ? 'rgba(244, 63, 94, 0.8)'
              : isRisk
              ? 'rgba(245, 158, 11, 0.8)'
              : 'rgba(52, 211, 153, 0.65)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([4, 3]);
            ctx.stroke();

            // Camp icon
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const markY = proj.py - (is2D ? 0 : 8);
            ctx.fillText('⛺', proj.px, markY);

            // Camp name label
            ctx.font = 'bold 9px sans-serif';
            ctx.fillStyle = isCompromised ? '#f43f5e' : isRisk ? '#f59e0b' : '#34d399';
            ctx.fillText(campAtNode.name.split(' ')[0], proj.px, markY + 12);
            ctx.restore();
          }
        }
      }

      ctx.restore(); // restores camera pan & zoom transform
      ctx.restore(); // restores DPR transform
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    grid,
    zoom,
    pan,
    mapSettings,
    selectedCellId,
    hoveredCell,
    projectCoordinates,
    gmdaPumps,
    weatherStations,
    rescueCamps,
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

      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetZoom}
        zoom={zoom}
      />
      <Legend />

      {/* Viewport Zoom & Pan Floating HUD */}
      <div
        className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/90 px-2.5 py-1.5 shadow-xl backdrop-blur-md text-xs"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-[11px] text-slate-400 pr-1 select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Zoom In (+)"
          className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Zoom Out (-)"
          className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
        >
          <span className="font-bold text-sm leading-none px-0.5 select-none">−</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleResetZoom(e);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Reset Viewport (↺)"
          className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Real-time Cell Hover Tooltip */}
      {hoveredCell && !selectedNode && (
        <div
          className="pointer-events-none fixed z-30 flex flex-col gap-1 rounded-lg border border-slate-700/80 bg-slate-950/92 p-2.5 text-xs shadow-2xl backdrop-blur-md max-w-xs"
          style={{
            left: `${mousePos.x + 16}px`,
            top: `${mousePos.y + 16}px`,
            transform: 'translate(0, 0)',
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 font-semibold text-slate-200">
            <span className="truncate">{hoveredCell.name}</span>
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

          {hoveredCell.channel && (
            <div className="text-[11px] font-medium" style={{ color: RECOGNIZED_CHANNELS[hoveredCell.channel]?.color }}>
              Channel: {RECOGNIZED_CHANNELS[hoveredCell.channel]?.name}
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
            <div>Water Depth: <span className="font-mono text-cyan-300">{hoveredCell.currentWaterLevel.toFixed(2)}m</span></div>
            <div>Elevation: <span className="font-mono text-slate-400">{hoveredCell.elevation.toFixed(1)}m MSL</span></div>
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

      {/* Selected Cell Inspector Floating HUD */}
      {selectedNode && (
        <div className="absolute top-4 left-4 z-20 w-88 rounded-xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 flex items-center gap-1">
                <Compass className="h-3 w-3" /> Guwahati Basin Telemetry HUD
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

            {/* Government-Recognized Channel Info */}
            {selectedNode.channel && (
              <div className="rounded-md bg-slate-900/90 p-2 border border-cyan-500/30 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: RECOGNIZED_CHANNELS[selectedNode.channel].color }}>
                    {RECOGNIZED_CHANNELS[selectedNode.channel].name}
                  </span>
                  <Badge size="xs" variant="outline" className="text-[9px]">
                    {RECOGNIZED_CHANNELS[selectedNode.channel].status}
                  </Badge>
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  Outfall: {RECOGNIZED_CHANNELS[selectedNode.channel].outfall}
                </div>
              </div>
            )}

            {/* GMDA Auto-Priming Pump Station Widget */}
            {selectedPump && (
              <div className="rounded-md bg-blue-950/30 p-2.5 border border-blue-500/40 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-blue-400" />
                    {selectedPump.name}
                  </span>
                  <Badge size="xs" variant={selectedPump.status === 'ACTIVE' ? 'safe' : selectedPump.status === 'STANDBY' ? 'warning' : 'critical'}>
                    {selectedPump.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                  <div>Rated: <strong className="text-white font-mono">{selectedPump.capacityM3Hr} m³/hr</strong></div>
                  <div>Output: <strong className="text-cyan-300 font-mono">{selectedPump.dischargeM3Hr} m³/hr</strong></div>
                  <div>Discharge: <strong className="text-slate-200">{selectedPump.channelDischarge}</strong></div>
                  <div>Power: <strong className="text-slate-200">{selectedPump.powerSource}</strong></div>
                </div>
                <Button
                  size="xs"
                  variant={selectedPump.status === 'ACTIVE' ? 'destructive' : 'cyan'}
                  onClick={() => toggleGMDAPump(selectedPump.id)}
                  className="w-full text-[10px] h-6 mt-1"
                >
                  {selectedPump.status === 'ACTIVE' ? 'Shut Down This Pump' : 'Arm Auto-Priming Unit'}
                </Button>
              </div>
            )}

            {/* Automatic Weather Station (AWS) Widget */}
            {selectedAWS && (
              <div className="rounded-md bg-amber-950/30 p-2.5 border border-amber-500/40 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-amber-400" />
                    {selectedAWS.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">{selectedAWS.stationCode}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 pt-0.5">
                  <div>Rainfall: <strong className="text-amber-300 font-mono">{selectedAWS.rainfallMmHr} mm/h</strong></div>
                  <div>24h Acc: <strong className="text-white font-mono">{selectedAWS.accumulatedRainfall24hMm} mm</strong></div>
                  <div>Humidity: <strong className="text-slate-200 font-mono">{selectedAWS.humidityPercent}%</strong></div>
                  <div>Wind: <strong className="text-slate-200 font-mono">{selectedAWS.windSpeedKmh} km/h</strong></div>
                </div>
              </div>
            )}

            {/* Rescue Camp Widget (If deployed at this coordinate) */}
            {selectedCamp && (
              <div className="rounded-md bg-emerald-950/30 p-2.5 border border-emerald-500/40 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Tent className="h-3.5 w-3.5 text-emerald-400" />
                    {selectedCamp.name}
                  </span>
                  <Badge size="xs" variant="safe">{selectedCamp.type.replace('_', ' ')}</Badge>
                </div>
                <div className="text-[10px] text-slate-300">
                  Occupancy: <strong className="text-white font-mono">{selectedCamp.currentOccupancy.toLocaleString()} / {selectedCamp.capacity.toLocaleString()}</strong> ({Math.round((selectedCamp.currentOccupancy / selectedCamp.capacity) * 100)}%)
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                  <div>Food: <strong className="text-amber-300 font-mono">{selectedCamp.supplies.foodRationsDays} days</strong></div>
                  <div>Water: <strong className="text-blue-300 font-mono">{selectedCamp.supplies.potableWaterLiters.toLocaleString()} L</strong></div>
                  <div>Boats: <strong className="text-cyan-300 font-mono">{selectedCamp.supplies.rescueBoats} rafts</strong></div>
                  <div>Med Kits: <strong className="text-rose-300 font-mono">{selectedCamp.supplies.medicalKits}</strong></div>
                </div>
                <Button
                  size="xs"
                  variant="cyan"
                  onClick={() => setActiveModal('rescue_camps')}
                  className="w-full text-[10px] h-6 mt-1"
                >
                  Manage Camp & Supplies
                </Button>
              </div>
            )}

            {/* High Ground Candidate for Rescue Camp */}
            {isHighGroundCandidate && (
              <div className="rounded-md bg-amber-950/25 p-2.5 border border-amber-500/40 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between text-amber-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Elevated Refuge Candidate
                  </span>
                  <Badge size="xs" variant="warning">SUITABLE</Badge>
                </div>
                <p className="text-[10px] text-slate-300">
                  High ground ({selectedNode.elevation.toFixed(1)}m MSL) with zero flood ponding. Strategic site for establishing a relief sanctuary.
                </p>
                <Button
                  size="xs"
                  variant="cyan"
                  onClick={() => {
                    deployRescueCamp({
                      gridX: selectedNode.x,
                      gridY: selectedNode.y,
                      name: `${selectedNode.name.replace(/\[\d+,\d+\]/, '').trim()} Relief Camp`,
                      type: 'MASS_SHELTER',
                      capacity: 4000,
                    });
                    playTacticalAlertSound('action');
                  }}
                  className="w-full text-[10px] h-6 font-bold"
                >
                  <Plus className="h-3 w-3 mr-1" /> Deploy Rescue Camp Here
                </Button>
              </div>
            )}

            {/* Nearest Safe Haven Route (for flooded / at-risk sectors) */}
            {nearestCampInfo?.camp && (selectedNode.status === 'CRITICAL' || selectedNode.status === 'WARNING') && (
              <div className="rounded-md bg-slate-900/90 p-2.5 border border-emerald-500/30 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Nearest Safe Camp:</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">{nearestCampInfo.distanceKm} km</span>
                </div>
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Tent className="h-3.5 w-3.5 text-emerald-400" />
                  {nearestCampInfo.camp.name}
                </div>
                <Button
                  size="xs"
                  variant="cyan"
                  onClick={() => {
                    if (nearestCampInfo.camp) {
                      evacuateResidentsToCamp(selectedNode.id, nearestCampInfo.camp.id, 800);
                      playTacticalAlertSound('action');
                    }
                  }}
                  className="w-full text-[10px] h-6"
                >
                  <MoveRight className="h-3 w-3 mr-1" /> Evacuate 800 Residents to Camp
                </Button>
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
                <span className="text-slate-400 block text-[10px]">Elevation (MSL)</span>
                <span className="font-mono text-base font-bold text-slate-300">
                  {selectedNode.elevation.toFixed(1)}m
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
              <Button
                size="sm"
                variant={selectedNode.barrierActive ? 'cyan' : 'outline'}
                onClick={() => toggleCellBarrier(selectedNode.id)}
                className="w-full justify-between text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  {selectedNode.barrierActive ? 'Barrier Deployed (+1.0m)' : 'Deploy Emergency Barrier'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {selectedNode.barrierActive ? 'ACTIVE' : 'READY'}
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
                  {selectedNode.evacuationOrdered ? 'ORDERED' : 'STANDBY'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
