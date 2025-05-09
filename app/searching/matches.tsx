// Matches.tsx
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
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
    <View style={s.card}>
      <LinearGradient
        colors={["#5A40EA", "#EE805F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.gradient}
      />
      <View style={s.cardContent}>
        <Text style={s.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={s.cardDesc} numberOfLines={3}>{item.description}</Text>
        ) : null}
        <View style={[
          s.statusBadge,
          item.status === 'pending' ? s.pending : item.status === 'accepted' ? s.accepted : s.rejected
        ]}>
          <Text style={s.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={apps}
      keyExtractor={(a) => a.id}
      renderItem={render}
      contentContainerStyle={{ paddingTop: 80, paddingHorizontal: 16, paddingBottom: 16 }}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', marginTop: 40 }}>
          Sin postulaciones
        </Text>
      }
    />
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    // shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation for Android
    elevation: 3,
  },
  gradient: {
    height: 8,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  pending: {
    backgroundColor: '#f0ad4e',
  },
  accepted: {
    backgroundColor: '#5cb85c',
  },
  rejected: {
    backgroundColor: '#d9534f',
  },
});
