import React, { useState, useMemo } from 'react';

export interface BubbleItem {
  id: string;
  name: string;
  count: number;
  traineesCount?: number;
  change?: string;
  trend?: string;
  color?: string;
  isPositive?: boolean;
}

interface ParticipationBubbleChartProps {
  data: BubbleItem[];
  className?: string;
  maxBubbles?: number;
  aspectRatio?: string;
}

// Fallback palette when colors are not provided or for varied overlapping distribution
const PALETTE = [
  '#2563eb', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
  '#3b82f6', // Bright Blue
  '#14b8a6', // Teal
];

interface PositionedBubble {
  id: string;
  name: string;
  count: number;
  change: string;
  color: string;
  radius: number;
  cx: number;
  cy: number;
  zIndex: number;
  fontSize: number;
}

export const ParticipationBubbleChart: React.FC<ParticipationBubbleChartProps> = ({
  data,
  className = '',
  maxBubbles = 10,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // SVG coordinate plane: 300 x 240
  const VB_WIDTH = 300;
  const VB_HEIGHT = 236;

  // 1. Process, extract counts (traineesCount ?? count), sort DESC by participation for layering
  // Critical: Highest participation bubbles appear BEHIND, Lowest appear IN FRONT
  // In SVG, elements rendered first appear behind, elements rendered later appear in front.
  // Therefore, rendering in DESC order (largest first, smallest last) naturally stacks largest in the back!
  const processedBubbles = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Map each item to uniform representation
    const mapped = data.map((item, idx) => {
      const countVal = Math.max(0, item.traineesCount ?? item.count ?? 0);
      const colorVal = item.color || PALETTE[idx % PALETTE.length];
      const changeVal = item.change || item.trend || '';
      return {
        id: item.id || `div-${idx}`,
        name: item.name || `Division ${idx + 1}`,
        count: countVal,
        change: changeVal,
        color: colorVal,
        originalIndex: idx,
      };
    });

    // Sort descending by count: highest participation first
    mapped.sort((a, b) => b.count - a.count);

    // Restrict to top N bubbles (default: top 10)
    const topItems = maxBubbles ? mapped.slice(0, maxBubbles) : mapped;

    const counts = topItems.map((m) => m.count);
    const maxVal = Math.max(...counts, 1);
    const minVal = Math.min(...counts, 0);

    // Radii bounds (square-root scaling for area proportionality)
    // Area = pi * r^2  =>  r ~ sqrt(value)
    const minRadius = topItems.length > 6 ? 18 : 22;
    const maxRadius = topItems.length === 1 ? 58 : topItems.length <= 4 ? 54 : 48;

    // Anchor positions optimized for intentional organic cluster overlaps
    // Center cluster around cx: 150, cy: 118
    const clusterAnchors = [
      { cx: 168, cy: 104 }, // 1. Largest / main cluster back anchor (right-center)
      { cx: 116, cy: 136 }, // 2. Second largest (left-bottom overlap)
      { cx: 108, cy: 88 },  // 3. Third (left-top overlap)
      { cx: 188, cy: 154 }, // 4. Fourth (bottom-right overlap)
      { cx: 204, cy: 78 },  // 5. Fifth (top-right overlap)
      { cx: 148, cy: 172 }, // 6. Sixth (bottom-center overlap)
      { cx: 72,  cy: 112 }, // 7. Seventh (outer left overlap)
      { cx: 228, cy: 124 }, // 8. Eighth (outer right overlap)
      { cx: 128, cy: 68 },  // 9. Ninth (top-center overlap)
      { cx: 222, cy: 168 }, // 10. Tenth (bottom-right flank overlap)
    ];

    const positioned: PositionedBubble[] = topItems.map((item, rank) => {
      // Area proportional: r = sqrt(count)
      // When all values are equal, fallback gracefully to a balanced radius
      let r = minRadius;
      if (maxVal === minVal) {
        r = (minRadius + maxRadius) / 2;
      } else {
        const sqrtRatio = Math.sqrt(item.count) / Math.sqrt(maxVal);
        r = minRadius + sqrtRatio * (maxRadius - minRadius);
      }

      // Determine anchor
      let anchor = { cx: 150, cy: 118 };
      if (rank < clusterAnchors.length) {
        anchor = clusterAnchors[rank];
      } else {
        // Deterministic polar distribution for any overflow bubbles
        const extraIdx = rank - clusterAnchors.length;
        const angle = (extraIdx * 55 * Math.PI) / 180;
        const dist = 75 + (extraIdx % 2) * 15;
        anchor = {
          cx: Math.round(150 + Math.cos(angle) * dist),
          cy: Math.round(118 + Math.sin(angle) * dist),
        };
      }

      // Clamp coordinates to prevent clipping against SVG boundaries
      const padding = 6;
      const clampedCx = Math.max(r + padding, Math.min(VB_WIDTH - r - padding, anchor.cx));
      const clampedCy = Math.max(r + padding, Math.min(VB_HEIGHT - r - padding, anchor.cy));

      // Font size proportional to bubble radius
      const fontSize = Math.max(10, Math.min(18, Math.round(r * 0.42)));

      return {
        id: item.id,
        name: item.name,
        count: item.count,
        change: item.change,
        color: item.color,
        radius: Math.round(r * 10) / 10,
        cx: clampedCx,
        cy: clampedCy,
        zIndex: rank + 1,
        fontSize,
      };
    });

    return positioned;
  }, [data, maxBubbles]);

  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 ${className}`}>
        <span className="text-xs font-medium">No division participation data available</span>
      </div>
    );
  }

  const hoveredBubble = processedBubbles.find((b) => b.id === hoveredId);

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* SVG Container with responsive viewBox */}
      <svg
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        className="w-full h-auto overflow-visible block"
        role="img"
        aria-label="Participation by Division Overlapping Bubble Chart"
      >
        <defs>
          {/* Subtle drop shadow filter for organic depth and clear layer differentiation */}
          <filter id="bubble-shadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#0f172a" floodOpacity="0.14" />
          </filter>
          <filter id="bubble-shadow-hover" x="-30%" y="-30%" width="170%" height="170%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>
        </defs>

        {/* Render Bubbles: DESC order ensures Largest is rendered first (behind), Smallest rendered last (in front) */}
        {processedBubbles.map((bubble) => {
          const isHovered = hoveredId === bubble.id;
          return (
            <g
              key={bubble.id}
              className="cursor-pointer transition-transform duration-300 ease-out"
              onMouseEnter={() => setHoveredId(bubble.id)}
              onMouseLeave={() => setHoveredId(null)}
              transform={isHovered ? `scale(1.05) translate(${-bubble.cx * 0.05}, ${-bubble.cy * 0.05})` : undefined}
            >
              {/* Outer white halo border + shadow */}
              <circle
                cx={bubble.cx}
                cy={bubble.cy}
                r={bubble.radius}
                fill={bubble.color}
                stroke="#ffffff"
                strokeWidth={isHovered ? 3.5 : 2.5}
                filter={isHovered ? 'url(#bubble-shadow-hover)' : 'url(#bubble-shadow)'}
                className="transition-all duration-300"
              />

              {/* Centered Numeric Value */}
              <text
                x={bubble.cx}
                y={bubble.cy}
                dy="0.34em"
                textAnchor="middle"
                fill="#ffffff"
                fontSize={bubble.fontSize}
                fontWeight="700"
                className="pointer-events-none tracking-tight select-none font-sans"
              >
                {bubble.count}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredBubble && (
        <div
          className="absolute pointer-events-none z-30 px-2.5 py-1.5 rounded-lg bg-slate-900/95 text-white shadow-xl text-center transform -translate-x-1/2 -translate-y-full transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: `${(hoveredBubble.cx / VB_WIDTH) * 100}%`,
            top: `${(hoveredBubble.cy / VB_HEIGHT) * 100 - 8}%`,
          }}
        >
          <div className="text-[11px] font-bold tracking-tight whitespace-nowrap">
            {hoveredBubble.name}
          </div>
          <div className="text-[10px] text-slate-300 font-medium whitespace-nowrap mt-0.5">
            <span className="font-bold text-white tabular-nums">{hoveredBubble.count}</span> trainees
            {hoveredBubble.change && <span className="ml-1 text-emerald-400">({hoveredBubble.change})</span>}
          </div>
        </div>
      )}
    </div>
  );
};
