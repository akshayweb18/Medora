import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Radius } from '@/constants/theme';

function SmoothTabBarButton({
  children,
  onPress,
  style,
  ...rest
}: any) {
  const handlePress = (e: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      android_ripple={{ color: Colors.primary + '18', borderless: true, radius: 28 }}
      style={({ pressed }) => [
        styles.tabBarButton,
        style,
        pressed && { opacity: 0.82 },
      ]}
    >
      {children}
    </Pressable>
  );
}

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  const [focusAnim] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 140,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [focused, focusAnim]);

  const scale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.05],
  });

  const translateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -2],
  });

  const pillOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const pillScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  return (
    <Animated.View style={[styles.tabItem, { transform: [{ scale }] }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pillBackground,
          {
            opacity: pillOpacity,
            transform: [{ scale: pillScale }],
          },
        ]}
      />
      <Animated.Text style={[styles.emoji, { transform: [{ translateY }] }]}>
        {emoji}
      </Animated.Text>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.tabLabel, focused && styles.tabLabelFocused]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        lazy: false,
        tabBarButton: (props) => <SmoothTabBarButton {...props} />,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 64 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💊" label="Medicines" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✨" label="AI Hub" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📋" label="Reports" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 72,
    paddingTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.xl,
    gap: 2,
    minWidth: 70,
    overflow: 'hidden',
  },
  pillBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  emoji: { fontSize: 20, lineHeight: 22 },
  tabLabel: {
    fontSize: 10,
    fontWeight: Typography.medium,
    color: Colors.gray400,
  },
  tabLabelFocused: { color: Colors.primary, fontWeight: Typography.semibold },
});

