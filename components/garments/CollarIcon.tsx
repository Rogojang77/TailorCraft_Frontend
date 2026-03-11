import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { BorderRadius } from '@/constants/design';

export type CollarType = 'clasic' | 'italian' | 'randunica' | 'mandarin';

interface CollarIconProps {
  type: CollarType;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZES = {
  sm: { width: 48, height: 36, padding: 8 },
  md: { width: 64, height: 44, padding: 10 },
  lg: { width: 80, height: 52, padding: 12 },
};

export function CollarIcon({ type, active = false, size = 'md', style }: CollarIconProps) {
  const { colors } = useTheme();
  const dimensions = SIZES[size];
  
  const strokeColor = active ? colors.primary : colors.textTertiary;
  const strokeWidth = active ? 2 : 1.2;

  const renderPath = () => {
    switch (type) {
      case 'clasic':
        return (
          <Svg viewBox="0 0 100 60" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Classic point collar */}
            <Path
              d="M10 10 L50 20 L90 10 L85 40 L50 35 L15 40 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </Svg>
        );
      
      case 'italian':
        return (
          <Svg viewBox="0 0 100 60" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Italian spread collar - wider spread */}
            <Path
              d="M5 15 L50 25 L95 15 L100 45 L50 35 L0 45 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </Svg>
        );
      
      case 'randunica':
        return (
          <Svg viewBox="0 0 100 60" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Cutaway/Wingtip collar (rândunică) */}
            <Path
              d="M20 10 L50 15 L80 10"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <Path
              d="M20 10 L35 25 L50 15 L65 25 L80 10"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </Svg>
        );
      
      case 'mandarin':
        return (
          <Svg viewBox="0 0 100 60" width={dimensions.width - dimensions.padding * 2} height={dimensions.height - dimensions.padding * 2}>
            {/* Mandarin/Band collar (rusesc) - rounded band */}
            <Path
              d="M30 20 C30 15, 70 15, 70 20 L70 35 C70 40, 30 40, 30 35 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
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
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const COLLAR_TYPES: { id: CollarType; labelKey: string }[] = [
  { id: 'clasic', labelKey: 'garments.collar.classic' },
  { id: 'italian', labelKey: 'garments.collar.italian' },
  { id: 'randunica', labelKey: 'garments.collar.cutaway' },
  { id: 'mandarin', labelKey: 'garments.collar.mandarin' },
];
