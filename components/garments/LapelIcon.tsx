import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { BorderRadius } from '@/constants/design';

export type LapelType = 'clasic' | 'spit' | 'sal';

interface LapelIconProps {
  type: LapelType;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZES = {
  sm: { width: 48, height: 56, padding: 8 },
  md: { width: 64, height: 76, padding: 12 },
  lg: { width: 80, height: 96, padding: 16 },
};

export function LapelIcon({ type, active = false, size = 'md', style }: LapelIconProps) {
  const { colors } = useTheme();
  const dimensions = SIZES[size];
  
  const strokeColor = active ? colors.primary : colors.textTertiary;
  const strokeWidth = active ? 2.5 : 1.5;

  const renderPath = () => {
    switch (type) {
      case 'clasic':
        return (
          <Svg viewBox="0 0 100 120" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Classic notch lapel */}
            <Path
              d="M50 15 L25 22 L22 45"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <Path
              d="M22 45 L10 45"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <Path
              d="M10 45 L40 105 L50 110"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Center guideline */}
            <Line
              x1="50"
              y1="5"
              x2="50"
              y2="115"
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          </Svg>
        );
      
      case 'spit':
        return (
          <Svg viewBox="0 0 100 120" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Peaked lapel (șpiț) */}
            <Path
              d="M50 18 L35 25 L32 40"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <Path
              d="M32 40 L5 12 L40 105 L50 110"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Center guideline */}
            <Line
              x1="50"
              y1="5"
              x2="50"
              y2="115"
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          </Svg>
        );
      
      case 'sal':
        return (
          <Svg viewBox="0 0 100 120" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Shawl lapel (șal) - smooth continuous curve */}
            <Path
              d="M50 15 C10 25 15 95 38 105 L50 110"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Center guideline */}
            <Line
              x1="50"
              y1="5"
              x2="50"
              y2="115"
              stroke={colors.border}
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          </Svg>
        );
      
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
          padding: dimensions.padding,
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? `${colors.primary}08` : colors.surface,
        },
        style,
      ]}
    >
      {renderPath()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const LAPEL_TYPES: { id: LapelType; labelKey: string }[] = [
  { id: 'clasic', labelKey: 'garments.lapel.classic' },
  { id: 'spit', labelKey: 'garments.lapel.peaked' },
  { id: 'sal', labelKey: 'garments.lapel.shawl' },
];
