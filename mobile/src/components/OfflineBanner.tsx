import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useOfflineBanner } from '../hooks/useOfflineBanner';

/**
 * Renders a persistent red banner at the top of the screen when the device
 * is offline. Drop this directly inside any root layout (e.g. AppNavigator).
 *
 * Usage:
 *   <OfflineBanner />
 *   <NavigationContainer>...</NavigationContainer>
 */
export function OfflineBanner() {
  const isOffline = useOfflineBanner();
  const [opacity] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: isOffline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <Text style={styles.text}>⚠ No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B91C1C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
