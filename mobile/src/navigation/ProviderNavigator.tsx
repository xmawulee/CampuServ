import React from 'react';
import { createMaterialTopTabNavigator, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { CustomIonicons as Ionicons } from '../components/CustomIcons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import ProviderDashboardHomeScreen from '../screens/provider/ProviderDashboardHomeScreen';
import IncomingRequestsScreen from '../screens/provider/IncomingRequestsScreen';
import MyListingsScreen from '../screens/provider/MyListingsScreen';
import ProviderEarningsScreen from '../screens/provider/ProviderEarningsScreen';
import ProviderProfileScreen from '../screens/provider/ProviderProfileScreen';

import { useTheme } from '../styles/ThemeContext';

const Tab = createMaterialTopTabNavigator();

type TabIconProps = {
  name: string;
  focused: boolean;
  colors: any;
};

function TabIcon({ name, focused, colors }: TabIconProps) {
  return (
    <View
      style={[
        styles.tabIconWrap,
        focused && { backgroundColor: colors.primary },
      ]}
    >
      <Ionicons
        name={name as any}
        size={21}
        color={focused ? '#FFFFFF' : colors.textMuted}
      />
    </View>
  );
}

function CustomProviderTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 8),
      paddingTop: 8,
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 12,
    }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1, alignItems: 'center' }}
            activeOpacity={0.8}
          >
             {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color: '' }) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ProviderNavigator() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <CustomProviderTabBar {...props} />}
        screenOptions={{
          swipeEnabled: true,
        }}
      >
      <Tab.Screen
        name="Dashboard"
        component={ProviderDashboardHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="Requests"
        component={IncomingRequestsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} colors={colors} />
          ),
          title: 'Opportunity Feed',
        }}
      />
      <Tab.Screen
        name="Listings"
        component={MyListingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} colors={colors} />
          ),
          title: 'My Services',
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={ProviderEarningsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'wallet' : 'wallet-outline'} focused={focused} colors={colors} />
          ),
          title: 'Earnings',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProviderProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} colors={colors} />
          ),
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
