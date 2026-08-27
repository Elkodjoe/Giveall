import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { OnboardingProvider } from '../src/state/OnboardingContext';

export default function RootLayout() {
  return (
    <OnboardingProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#160F1C' },
        }}
      />
    </OnboardingProvider>
  );
}
