// Matches.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from '../utils/firebaseconfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

type App = {
  id: string;
  jobId: string;
  status: string;
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  imageUrl: string;
  latitude?: number;
  longitude?: number;
};

type Job = {
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  imageUrl: string;
  latitude?: number;
  longitude?: number;
};

export default function Matches() {
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState<App | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', auth.currentUser!.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const enriched = await Promise.all(
        snap.docs.map(async (d) => {
          // datos básicos de la aplicación
          const data = d.data() as App;

          // traigo TODO del job
          const jobSnap = await getDoc(doc(db, 'jobs', data.jobId));
          if (!jobSnap.exists()) return null;
          const job = jobSnap.data() as Job;

          // parcheo título/desc (igual que antes) + seteo todos los campos extra
          const title = data.title || job.title;
          const description = data.description || job.description;
          const app: App = {
            id: d.id,
            jobId: data.jobId,
            status: data.status,
            title,
            description,
            pay: job.pay,
            duration: job.duration,
            requirements: job.requirements,
            imageUrl: job.imageUrl,
            latitude: job.latitude,
            longitude: job.longitude,
          };

          // actualizo solo title/description si faltaban
          if (!data.title || !data.description) {
            await updateDoc(d.ref, { title, description });
          }
          return app;
        })
      );

      // filtro nulls por si alguno falló
      setApps(enriched.filter((a): a is App => !!a));
    });
    return () => unsub();
  }, []);

  const openDetails = (app: App) => {
    setSelected(app);
  };

  const renderApp = ({ item }: { item: App }) => (
    <TouchableOpacity
      style={s.cardWrapper}
      onPress={() => openDetails(item)}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={{ uri: item.imageUrl }}
        style={s.card}
        imageStyle={s.cardImage}
      >
        <View style={s.cardOverlay}>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.desc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={s.subtitle}>
            {item.duration} • {item.pay}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      {apps.length === 0 ? (
        <View style={s.noJobsContainer}>
          <Text style={s.noJobsText}>Sin postulaciones</Text>
        </View>
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(a) => a.id}
          renderItem={renderApp}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}

      {/* Modal Detalle */}
      {selected && (
        <Modal transparent animationType="slide" visible>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <ScrollView>
                {selected.imageUrl && (
                  <Image
                    source={{ uri: selected.imageUrl }}
                    style={s.modalImage}
                  />
                )}
                <Text style={s.modalTitle}>{selected.title}</Text>
                <Text style={s.detailText}>{selected.description}</Text>
                <Text style={s.detailText}>Salario: {selected.pay}</Text>
                <Text style={s.detailText}>
                  Duración: {selected.duration}
                </Text>
                <View style={s.detailList}>
                  <Text style={s.detailText}>Requisitos:</Text>
                  {selected.requirements.map((r, i) => (
                    <Text key={i} style={s.detailText}>
                      • {r}
                    </Text>
                  ))}
                </View>
                <MapView
                  style={s.detailMap}
                  initialRegion={{
                    latitude: selected.latitude ?? 4.711,
                    longitude: selected.longitude ?? -74.0721,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: selected.latitude ?? 4.711,
                      longitude: selected.longitude ?? -74.0721,
                    }}
                  />
                </MapView>
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  style={s.modalClose}
                >
                  <Text style={s.modalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </ScrollView>
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
    backgroundColor: '#f5f5f5',
    paddingTop: getStatusBarHeight(true),
    paddingHorizontal: 16,
  },
  noJobsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noJobsText: {
    fontSize: 18,
    color: '#444',
  },

  /* === Reutilizo exactamente tus estilos de MyJobs === */
  cardWrapper: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  card: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  cardImage: {
    resizeMode: 'cover',
  },
  cardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  desc: {
    color: '#eee',
    fontSize: 14,
    marginVertical: 4,
  },
  subtitle: {
    color: '#eee',
    fontSize: 14,
    marginTop: 4,
  },

  /* === Modal === */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '85%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  detailList: {
    marginBottom: 12,
  },
  detailMap: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 12,
  },
  modalClose: {
    backgroundColor: '#5A40EA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
});
