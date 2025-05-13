// Matches.tsx
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { TouchableOpacity, Modal, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import { auth, db } from '../utils/firebaseconfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import MapView, { Marker } from 'react-native-maps';

type App = {
  id: string;
  jobId: string;
  status: string;
  title?: string;
  description?: string;
  pay?: string;
  duration?: string;
  requirements?: string[];
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
};

type Job = {
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
};

export default function Matches() {
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState< (App & { imageUrl?: string }) | null >(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const openDetails = async (app: App) => {
    setLoadingDetails(true);
    const jobSnap = await getDoc(doc(db, 'jobs', app.jobId));
    let details = {} as Partial<App>;
    if (jobSnap.exists()) {
      const data = jobSnap.data() as Job;
      details = {
        pay: data.pay,
        duration: data.duration,
        requirements: data.requirements,
        latitude: data.latitude,
        longitude: data.longitude,
        imageUrl: data.imageUrl,
      };
    }
    setSelected({ ...app, ...details });
    setLoadingDetails(false);
  };

  const render = ({ item }: { item: App }) => (
    <TouchableOpacity onPress={() => openDetails(item)}>
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <FlatList
        data={apps}
        keyExtractor={(a) => a.id}
        renderItem={render}
        contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>
            Sin postulaciones
          </Text>
        }
      />
      {selected && (
        <Modal transparent animationType="slide" visible>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              {loadingDetails ? (
                <ActivityIndicator size="large" />
              ) : (
                <>
                  {selected.imageUrl ? (
                    <Image source={{ uri: selected.imageUrl }} style={s.modalImage} />
                  ) : null}
                  <Text style={s.cardTitle}>{selected.title}</Text>
                  <Text style={s.cardDesc}>{selected.description}</Text>
                  <View style={[
                    s.statusBadge,
                    selected.status === 'pending' ? s.pending :
                    selected.status === 'accepted' ? s.accepted : s.rejected
                  ]}>
                    <Text style={s.statusText}>{selected.status.toUpperCase()}</Text>
                  </View>
                  {selected.pay && (
                    <Text style={s.detailText}>Salario: {selected.pay}</Text>
                  )}
                  {selected.requirements && (
                    <View style={s.detailList}>
                      <Text style={s.detailText}>Requisitos:</Text>
                      {selected.requirements.map((req, i) => (
                        <Text key={i} style={s.detailText}>• {req}</Text>
                      ))}
                    </View>
                  )}
                  <MapView
                    style={s.detailMap}
                    initialRegion={{
                      latitude: selected.latitude ?? 4.7110,
                      longitude: selected.longitude ?? -74.0721,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: selected.latitude ?? 4.7110,
                        longitude: selected.longitude ?? -74.0721,
                      }}
                    />
                  </MapView>
                  <TouchableOpacity onPress={() => setSelected(null)} style={s.modalClose}>
                    <Text style={s.statusText}>Cerrar</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: getStatusBarHeight(true),
    backgroundColor: '#f5f5f5',
  },
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
    marginVertical: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalClose: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#5A40EA',
    borderRadius: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  detailList: {
    width: '100%',
    marginBottom: 12,
  },
  detailMap: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
});
