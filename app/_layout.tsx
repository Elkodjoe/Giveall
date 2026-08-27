import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/state/AuthContext';
import { OnboardingProvider } from '../src/state/OnboardingContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#160F1C' },
          }}
        />
      </OnboardingProvider>
    </AuthProvider>
  );
}
