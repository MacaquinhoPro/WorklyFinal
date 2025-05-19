// Matches.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ImageBackground,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
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
  deleteDoc,
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

/* ---------- tipos ---------- */
type App = {
  id: string;
  jobId: string;
  status: 'pending' | 'accepted' | 'denied' | 'interview';
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  imageUrl: string;
  latitude?: number;
  longitude?: number;
  interviewAt?: number | null;      // ← fecha/hora de entrevista (epoch ms)
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

/* ---------- utilidades ---------- */
const fmt = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

const translateStatus = (s: string) => {
  switch (s) {
    case 'pending':
      return 'Pendiente';
    case 'accepted':
      return 'Aceptada';
    case 'denied':
      return 'Rechazada';
    case 'interview':
      return 'Entrevista';
    default:
      return s;
  }
};

/* ============================================================ */
export default function Matches() {
  /* ---------- notificaciones ---------- */
  // ids de notificaciones ya programadas por app.id
  const notifIdsRef = useRef<Record<string, string>>({});

  // Handler global (muestra alerta + sonido)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Crear canal para Android una sola vez
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('interviews', {
          name: 'Entrevistas',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permiso de notificaciones no concedido');
      }
    })();
  }, []);

  /* ---------- estado ---------- */
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------- carga en tiempo real ---------- */
  useEffect(() => {
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', auth.currentUser!.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const enriched = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data() as App;

          // consultar datos del trabajo
          const jobSnap = await getDoc(doc(db, 'jobs', data.jobId));
          if (!jobSnap.exists()) return null;
          const job = jobSnap.data() as Job;

          // asegurar que siempre tengamos título/descrición guardados
          const title = data.title || job.title;
          const description = data.description || job.description;
          if (!data.title || !data.description) {
            await updateDoc(d.ref, { title, description });
          }

          return {
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
            interviewAt: (data as any).interviewAt ?? null,
          } as App;
        })
      );

      setApps(enriched.filter((a): a is App => !!a));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ---------- programa / cancela notificaciones ---------- */
  useEffect(() => {
    (async () => {
      for (const app of apps) {
        const storedId = notifIdsRef.current[app.id];

        // 1) Si hay entrevista futura y no está programada → programar
        if (
          app.interviewAt &&
          app.interviewAt > Date.now() &&
          !storedId
        ) {
          const notifId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Entrevista programada',
              body: `Entrevista para "${app.title}" a las ${fmt(
                app.interviewAt
              )}`,
              sound: 'default',
            },
            trigger: {
              channelId: 'interviews',
              date: new Date(app.interviewAt),
            } as any,
          });
          notifIdsRef.current[app.id] = notifId;
        }

        // 2) Si ya no hay entrevista o está en pasado → cancelar y limpiar
        if (
          (!app.interviewAt || app.interviewAt <= Date.now()) &&
          storedId
        ) {
          await Notifications.cancelScheduledNotificationAsync(storedId);
          delete notifIdsRef.current[app.id];
        }
      }
    })();
  }, [apps]);

  /* ---------- cancelar postulación ---------- */
  const handleCancel = (app: App) => {
    Alert.alert(
      'Cancelar postulación',
      `¿Deseas cancelar tu postulación a "${app.title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              // cancelar notificación pendiente (si la hay)
              const storedId = notifIdsRef.current[app.id];
              if (storedId) {
                await Notifications.cancelScheduledNotificationAsync(
                  storedId
                );
                delete notifIdsRef.current[app.id];
              }
              await deleteDoc(doc(db, 'applications', app.id));
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'No se pudo cancelar la postulación.');
            }
          },
        },
      ]
    );
  };

  /* ---------- render tarjeta ---------- */
  const renderApp = ({ item }: { item: App }) => (
    <TouchableOpacity
      style={s.cardWrapper}
      onPress={() => setSelected(item)}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={{ uri: item.imageUrl }}
        style={s.card}
        imageStyle={s.cardImage}
      >
        <View style={s.cardOverlay}>
          <View style={s.cardHeader}>
            <Text style={s.status}>{translateStatus(item.status)}</Text>

            {/* Botón cancelar */}
            <TouchableOpacity
              onPress={() => handleCancel(item)}
              style={s.cancelBtn}
              hitSlop={8}
            >
              <Text style={s.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.title}>{item.title}</Text>
          <Text style={s.desc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={s.subtitle}>
            {item.duration} • {item.pay}
          </Text>
          {item.interviewAt && (
            <Text style={s.desc}>Entrevista: {fmt(item.interviewAt)}</Text>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  /* ---------- render principal ---------- */
  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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

      {/* ---------- Modal Detalle ---------- */}
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
                <Text style={s.detailText}>
                  Estado: {translateStatus(selected.status)}
                </Text>
                <Text style={s.detailText}>Salario: {selected.pay}</Text>
                <Text style={s.detailText}>Duración: {selected.duration}</Text>
                {selected.interviewAt && (
                  <Text style={s.detailText}>
                    Entrevista: {fmt(selected.interviewAt)}
                  </Text>
                )}

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

/* ---------- estilos ---------- */
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: getStatusBarHeight(true),
    paddingHorizontal: 16,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  /* --- Tarjeta --- */
  cardWrapper: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  card: {
    width: '100%',
    height: 190,
    justifyContent: 'flex-end',
  },
  cardImage: {
    resizeMode: 'cover',
  },
  cardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 6,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 64, 64, 0.9)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  cancelTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
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
  /* --- Modal --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: getStatusBarHeight(true) + 40,
    alignItems: 'center',
  },
  modalBox: {
    width: '88%',
    maxHeight: '88%',
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
