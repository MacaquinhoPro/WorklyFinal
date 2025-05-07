// Matches.tsx
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { auth, db } from '../utils/firebaseconfig';

type App = {
  id: string;
  jobId: string;
  status: string;
  title?: string;
  description?: string;
};

type Job = {
  title: string;
  description: string;
};

export default function Matches() {
  const [apps, setApps] = useState<App[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', auth.currentUser!.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const enriched = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as App;

          // Si falta description o title, los extraemos del job y los parcheamos
          if (!data.description || !data.title) {
            const jobSnap = await getDoc(doc(db, 'jobs', data.jobId));
            if (jobSnap.exists()) {
              const jobData = jobSnap.data() as Job;
              data.title = data.title || jobData.title;
              data.description = data.description || jobData.description;
              // parchea el doc para que la próxima lectura ya esté completo
              await updateDoc(d.ref, {
                title: data.title,
                description: data.description,
              });
            }
          }
          const { id, ...restData } = data;
          return { id: d.id, ...restData };
        })
      );

      setApps(enriched);
    });

    return () => unsub();
  }, []);

  const render = ({ item }: { item: App }) => (
    <View style={s.item}>
      <Text style={s.title}>{item.title}</Text>
      {item.description ? (
        <Text style={s.desc}>{item.description}</Text>
      ) : null}
      <Text style={s.status}>{item.status}</Text>
    </View>
  );

  return (
    <FlatList
      data={apps}
      keyExtractor={(a) => a.id}
      renderItem={render}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', marginTop: 40 }}>
          Sin postulaciones
        </Text>
      }
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
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  desc: { color: '#444', marginBottom: 8 },
  status: { fontStyle: 'italic', color: '#666' },
});
