import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';

type App = { jobId: string; status: string; id: string };

export default function Matches() {
  const [apps, setApps] = useState<App[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', auth.currentUser!.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, []);

  const render = ({ item }: { item: App }) => (
    <View style={s.item}>
      <Text style={{ fontWeight: 'bold' }}>{item.jobId}</Text>
      <Text>{item.status}</Text>
    </View>
  );

  return (
    <FlatList
      data={apps}
      keyExtractor={(a) => a.id}
      renderItem={render}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>Sin postulaciones</Text>}
    />
  );
}

const s = StyleSheet.create({
  item: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
  },
});
