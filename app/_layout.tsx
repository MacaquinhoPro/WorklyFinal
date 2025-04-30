// app/_layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import useAuth from '../app/utils/useAuth';
import useRole from '../app/utils/useRole';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const { uid, loading }   = useAuth();
  const { role, roleLoading } = useRole(uid);
  const router = useRouter();

  // ——— Redirección POS-montaje ———
  useEffect(() => {
    if (loading || roleLoading) return;        // todavía cargando
    if (!uid) router.replace('/login');
    else if (role === 'searching') router.replace('/searching/feed');
    else if (role === 'hiring')    router.replace('/hiring/myJobs');
  }, [loading, roleLoading, uid, role]);

  // ——— Siempre devolvemos navegación ———
  if (loading || roleLoading) {
    return (
      <View style={{ flex:1,justifyContent:'center',alignItems:'center' }}>
        <ActivityIndicator size="large" />
        {/* El <Slot/> mantiene a Expo-router contento */}
        <Slot />
      </View>
    );
  }

  return <Slot />;   // aquí ya redirigimos en el effect
}
