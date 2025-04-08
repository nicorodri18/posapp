// app/Layout.tsx
import { Stack } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#282c34' }}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        // Muestra la pantalla de inicio si no hay usuario autenticado
        <Stack.Screen name="index" />
      ) : (
        // Muestra la pantalla POSApp si el usuario está autenticado
        <Stack.Screen name="posapp/posapp" />  // Aquí es donde debes usar la ruta correcta
      )}
    </Stack>
  );
}