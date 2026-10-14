/**
 * GarmentGlyph — minimalist SVG line drawings for garment types.
 * Renders as a fixed-size square canvas. Pass `color` to tint.
 */
import React from 'react';
import Svg, { Path, Line, Circle } from 'react-native-svg';

export type GarmentType =
  | 'suit'
  | 'shirt'
  | 'dress'
  | 'blazer'
  | 'pants'
  | 'coat'
  | 'skirt'
  | 'vest'
  | 'default';

interface GarmentGlyphProps {
  type?: GarmentType;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const props = (color: string, strokeWidth: number) => ({
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

function SuitGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* jacket body */}
      <Path d="M14 4 L10 10 L4 12 L4 28 L28 28 L28 12 L22 10 L18 4" {...p} />
      {/* lapels */}
      <Path d="M14 4 L16 14 L18 4" {...p} />
      {/* collar notch */}
      <Path d="M16 14 L13 9" {...p} />
      <Path d="M16 14 L19 9" {...p} />
      {/* pocket */}
      <Path d="M8 18 L12 18 L12 22 L8 22 Z" {...p} />
    </>
  );
}

function ShirtGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* body */}
      <Path d="M12 4 L8 8 L4 6 L4 12 L8 12 L8 28 L24 28 L24 12 L28 12 L28 6 L24 8 L20 4" {...p} />
      {/* collar */}
      <Path d="M12 4 L16 10 L20 4" {...p} />
      {/* button placket */}
      <Line x1="16" y1="10" x2="16" y2="28" {...p} />
      {/* buttons */}
      <Circle cx="16" cy="14" r="0.8" fill={color} />
      <Circle cx="16" cy="18" r="0.8" fill={color} />
      <Circle cx="16" cy="22" r="0.8" fill={color} />
    </>
  );
}

function DressGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* bodice */}
      <Path d="M12 4 L8 8 L4 10 L6 16 L10 16 L10 20 L22 20 L22 16 L26 16 L28 10 L24 8 L20 4" {...p} />
      {/* skirt flare */}
      <Path d="M10 20 L6 30 L26 30 L22 20" {...p} />
      {/* straps */}
      <Path d="M12 4 C12 4 14 6 16 6 C18 6 20 4 20 4" {...p} />
    </>
  );
}

function BlazerGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* body */}
      <Path d="M14 4 L10 10 L4 12 L4 28 L28 28 L28 12 L22 10 L18 4" {...p} />
      {/* wide lapels */}
      <Path d="M14 4 L16 12 L18 4" {...p} />
      <Path d="M16 12 L12 8" {...p} />
      <Path d="M16 12 L20 8" {...p} />
      {/* welt pocket */}
      <Path d="M19 20 L24 20" {...p} />
    </>
  );
}

function PantsGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* waistband */}
      <Path d="M6 4 L26 4 L26 8 L6 8 Z" {...p} />
      {/* left leg */}
      <Path d="M6 8 L6 30 L16 30 L16 8" {...p} />
      {/* right leg */}
      <Path d="M16 8 L16 30 L26 30 L26 8" {...p} />
      {/* crease */}
      <Line x1="11" y1="10" x2="10" y2="28" {...p} />
      <Line x1="21" y1="10" x2="22" y2="28" {...p} />
    </>
  );
}

function CoatGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* long body */}
      <Path d="M13 4 L9 9 L4 11 L4 32 L28 32 L28 11 L23 9 L19 4" {...p} />
      {/* lapels */}
      <Path d="M13 4 L16 13 L19 4" {...p} />
      <Path d="M16 13 L12 7" {...p} />
      <Path d="M16 13 L20 7" {...p} />
      {/* belt */}
      <Path d="M4 20 L28 20" {...p} />
      <Path d="M13 20 L13 22 L19 22 L19 20" {...p} />
    </>
  );
}

function SkirtGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* waistband */}
      <Path d="M8 4 L24 4 L24 8 L8 8 Z" {...p} />
      {/* a-line body */}
      <Path d="M8 8 L4 30 L28 30 L24 8" {...p} />
      {/* pleat hint */}
      <Line x1="16" y1="8" x2="16" y2="18" {...p} />
    </>
  );
}

function VestGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <>
      {/* body — no sleeves */}
      <Path d="M12 4 L8 10 L4 10 L4 28 L28 28 L28 10 L24 10 L20 4" {...p} />
      {/* v-neck */}
      <Path d="M12 4 L16 12 L20 4" {...p} />
      {/* buttons */}
      <Circle cx="16" cy="16" r="0.8" fill={color} />
      <Circle cx="16" cy="20" r="0.8" fill={color} />
      <Circle cx="16" cy="24" r="0.8" fill={color} />
    </>
  );
}

function DefaultGlyph({ color, sw }: { color: string; sw: number }) {
  const p = props(color, sw);
  return (
    <Path d="M16 4 L8 12 L8 28 L24 28 L24 12 Z" {...p} />
  );
}

export function GarmentGlyph({
  type = 'default',
  size = 32,
  color = '#9C7A3E',
  strokeWidth = 1.5,
}: GarmentGlyphProps) {
  const sw = strokeWidth;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {type === 'suit' && <SuitGlyph color={color} sw={sw} />}
      {type === 'shirt' && <ShirtGlyph color={color} sw={sw} />}
      {type === 'dress' && <DressGlyph color={color} sw={sw} />}
      {type === 'blazer' && <BlazerGlyph color={color} sw={sw} />}
      {type === 'pants' && <PantsGlyph color={color} sw={sw} />}
      {type === 'coat' && <CoatGlyph color={color} sw={sw} />}
      {type === 'skirt' && <SkirtGlyph color={color} sw={sw} />}
      {type === 'vest' && <VestGlyph color={color} sw={sw} />}
      {type === 'default' && <DefaultGlyph color={color} sw={sw} />}
    </Svg>
  );
}
