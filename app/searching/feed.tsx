import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { collection, onSnapshot, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';
import { router } from 'expo-router';     

type Job = {
  id: string;
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  ownerUid: string;
};

export default function Feed() {
  const [cards, setCards] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setCards(arr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const apply = async (job: Job) => {
    const id = `${job.id}_${auth.currentUser!.uid}`;
    await setDoc(doc(db, 'applications', id), {
      jobId: job.id,
      userId: auth.currentUser!.uid,
      status: 'pending',
      createdAt: Date.now(),
    });
    Alert.alert('Aplicado', `Te postulaste a ${job.title}`);
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" /></View>;
  }

  if (cards.length === 0) {
    return <View style={s.center}><Text>No hay ofertas (desliza hacia abajo para refrescar)</Text></View>;
  }

  return (
    <View style={{ flex: 1, paddingTop: 60 }}>
      <Swiper
        cards={cards}
        renderCard={(job) => <Card job={job} />}
        onSwipedRight={(i) => apply(cards[i])}
        cardIndex={0}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={15}
        overlayLabels={{
          right: { title: 'APLICAR', style: { label: { color: 'green', fontSize: 24 } } },
        }}
      />
    </View>
  );
}

function Card({ job }: { job: Job }) {
  return (
    <View style={s.card}>
      <Text style={s.title}>{job.title}</Text>
      <Text>{job.pay} • {job.duration}</Text>
      <Text style={{ marginTop: 6 }} numberOfLines={4}>{job.description}</Text>
      <Text style={{ marginTop: 6, fontStyle: 'italic' }}>
        {job.requirements.join(', ')}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: Dimensions.get('window').width - 40,
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
