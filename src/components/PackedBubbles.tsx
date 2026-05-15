import { hierarchy, pack } from "d3-hierarchy";
import { useMemo, useState } from "react";
import { Paper, Text } from "@mantine/core";

export interface PackedBubbleDatum {
  id: string;
  value: number;
  /** Optional palette key. Mapped to a fixed color; bubbles with the same
   * key share a color. When omitted every bubble uses ``fallbackColor``. */
  group?: string;
  /** Optional longer label shown only in the tooltip. */
  tooltip?: string;
}

export interface PackedBubblesProps {
  data: PackedBubbleDatum[];
  width?: number;
  height?: number;
  /** Cycle of colors used when ``group`` is set, keyed by group id. */
  palette?: string[];
  fallbackColor?: string;
  /** Minimum radius below which the inner label is hidden (too tight). */
  labelMinRadius?: number;
}

const DEFAULT_PALETTE = [
  "var(--mantine-color-blue-6)",
  "var(--mantine-color-orange-6)",
  "var(--mantine-color-red-5)",
  "var(--mantine-color-teal-5)",
  "var(--mantine-color-grape-6)",
  "var(--mantine-color-yellow-6)",
  "var(--mantine-color-cyan-6)",
  "var(--mantine-color-lime-6)",
];

/**
 * Packed bubble chart (circle packing). Bubbles nest tightly, size proportional
 * to ``value``. Each bubble shows its ``id`` + value inside if there's room.
 */
export function PackedBubbles({
  data,
  width = 520,
  height = 320,
  palette = DEFAULT_PALETTE,
  fallbackColor = "var(--mantine-color-grape-6)",
  labelMinRadius = 22,
}: PackedBubblesProps) {
  const [hover, setHover] = useState<
    | { datum: PackedBubbleDatum; x: number; y: number }
    | null
  >(null);

  const groupToColor = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const d of data) {
      if (d.group && !map.has(d.group)) {
        map.set(d.group, palette[i % palette.length]);
        i += 1;
      }
    }
    return map;
  }, [data, palette]);

  const layout = useMemo(() => {
    if (!data.length) return [];
    const root = hierarchy<{ children?: PackedBubbleDatum[]; value?: number }>({
      children: data,
    })
      .sum((d) => (d as unknown as PackedBubbleDatum).value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    pack<{ children?: PackedBubbleDatum[]; value?: number }>()
      .size([width, height])
      .padding(3)(root);

    return (root.leaves() as unknown as Array<{
      x: number;
      y: number;
      r: number;
      data: PackedBubbleDatum;
    }>);
  }, [data, width, height]);

  if (!data.length) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="xl">
        Sem dados.
      </Text>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block" }}
      >
        {layout.map((node) => {
          const d = node.data;
          const color = d.group
            ? groupToColor.get(d.group) ?? fallbackColor
            : fallbackColor;
          const showLabel = node.r >= labelMinRadius;
          const labelSize = Math.max(
            10,
            Math.min(18, Math.round(node.r / 3.5)),
          );
          const valueSize = Math.max(9, Math.min(14, labelSize - 2));
          return (
            <g
              key={d.id}
              transform={`translate(${node.x}, ${node.y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover({ datum: d, x: node.x, y: node.y })}
              onMouseLeave={() => setHover(null)}
            >
              <circle
                r={node.r}
                fill={color}
                stroke="var(--mantine-color-body)"
                strokeWidth={1.5}
                opacity={hover && hover.datum.id !== d.id ? 0.55 : 0.95}
              />
              {showLabel && (
                <>
                  <text
                    textAnchor="middle"
                    dy="-0.15em"
                    fill="white"
                    fontWeight={600}
                    fontSize={labelSize}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {d.id}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="1em"
                    fill="white"
                    fontSize={valueSize}
                    opacity={0.85}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {d.value.toLocaleString("pt-BR")}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          style={{
            position: "absolute",
            left: `${(hover.x / width) * 100}%`,
            top: `${(hover.y / height) * 100}%`,
            transform: "translate(-50%, -120%)",
            pointerEvents: "none",
          }}
        >
          <Paper withBorder shadow="sm" p="xs" radius="sm">
            <Text fw={600} size="sm">
              {hover.datum.id}
            </Text>
            <Text size="xs" c="dimmed">
              {hover.datum.value.toLocaleString("pt-BR")} ocorrência
              {hover.datum.value === 1 ? "" : "s"}
            </Text>
            {hover.datum.tooltip && (
              <Text size="xs" c="dimmed">
                {hover.datum.tooltip}
              </Text>
            )}
          </Paper>
        </div>
      )}
    </div>
  );
}
