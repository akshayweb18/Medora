/**
 * Type-safe navigation helper that bypasses Expo Router's strict typed-routes
 * for dynamic paths not yet in the generated type list.
 */
import { router } from 'expo-router';

/** Navigate to any route, bypassing typed-route checks for dynamic paths. */
export function navigate(href: string) {
  router.push(href as any);
}

export function replace(href: string) {
  router.replace(href as any);
}

export function back() {
  router.back();
}
