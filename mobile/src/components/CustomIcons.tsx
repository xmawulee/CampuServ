import React from 'react';
import { Ionicons as ExpoIonicons, MaterialCommunityIcons as ExpoMCI } from '@expo/vector-icons';

export function CustomIonicons({ name, size, color, style }: any) {
  return <ExpoIonicons name={name} size={size} color={color} style={style} />;
}

export function CustomMCI({ name, size, color, style }: any) {
  return <ExpoMCI name={name} size={size} color={color} style={style} />;
}
