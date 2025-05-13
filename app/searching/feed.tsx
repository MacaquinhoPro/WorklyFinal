import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Modal,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Swiper from 'react-native-deck-swiper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  onSnapshot,
  setDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';

const ICONS = ['rewind', 'close', 'star-outline', 'heart', 'map'];

type Job = {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  ownerUid: string;
  latitude?: number;
  longitude?: number;
};

export default function Feed() {
  /* ---------- estado ---------- */
  const [jobsRaw, setJobsRaw] = useState<Job[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const swiperRef = useRef<any>(null);
  const [mapJob, setMapJob] = useState<Job | null>(null);

  const defaultRegion = {
    latitude: 4.7110,
    longitude: -74.0721,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  /* ---------- stream de trabajos ---------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setJobsRaw(arr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ---------- stream de aplicaciones del usuario ---------- */
  useEffect(() => {
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', auth.currentUser!.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.docs.forEach((d) => ids.add(d.data().jobId));
      setAppliedIds(ids);
    });
    return () => unsub();
  }, []);

  /* ---------- vista filtrada ---------- */
  const cards = useMemo(
    () => jobsRaw.filter((j) => !appliedIds.has(j.id)),
    [jobsRaw, appliedIds]
  );

  /* ---------- postularse ---------- */
  const apply = async (job: Job) => {
    try {
      const appId = `${job.id}_${auth.currentUser!.uid}`;
      await setDoc(doc(db, 'applications', appId), {
        jobId: job.id,
        userId: auth.currentUser!.uid,
        status: 'pending',
        createdAt: Date.now(),
        title: job.title,
        description: job.description,
      });
      Alert.alert('¡Listo!', `Te postulaste a ${job.title}`);
      // elimina de UI inmediatamente
      // swiperRef.current?.swipeRight(); // para la animación
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  /* ---------- rechazar ---------- */
  const reject = (job: Job) => {
    Alert.alert('Oferta descartada', `Descartaste ${job.title}`);
    // swiperRef.current?.swipeLeft();
  };

  /* ---------- loading / vacío ---------- */
  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (!cards.length) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.finalText}>
          No hay más ofertas nuevas por ahora. ¡Vuelve más tarde!
        </Text>
      </View>
    );
  }

  /* ---------- UI ---------- */
  return (
    <View style={s.container}>
      <Swiper
        ref={swiperRef}
        cards={cards}
        renderCard={(job) => (
          <Card
            job={job}
            onSwipeLeft={() => swiperRef.current?.swipeLeft()}
            onSwipeRight={() => swiperRef.current?.swipeRight()}
            onMapPress={() => setMapJob(job)}
          />
        )}
        onSwipedRight={(i) => apply(cards[i])}
        onSwipedLeft={(i) => reject(cards[i])}
        disableLeftSwipe={!!mapJob}
        disableRightSwipe={!!mapJob}
        disableTopSwipe={!!mapJob}
        disableBottomSwipe={!!mapJob}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={15}
        overlayLabels={{
          left: {
            title: 'NOPE',
            style: {
              label: {
                color: '#FF5B5B',
                fontSize: 32,
                borderWidth: 2,
                borderColor: '#FF5B5B',
              },
            },
          },
          right: {
            title: 'LIKE',
            style: {
              label: {
                color: '#4EFF82',
                fontSize: 32,
                borderWidth: 2,
                borderColor: '#4EFF82',
              },
            },
          },
        }}
      />
      {mapJob && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setMapJob(null)}>
          <View style={s.modalOverlay}>
            <View style={s.mapContainer}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={
                  mapJob.latitude && mapJob.longitude
                    ? {
                        latitude: mapJob.latitude,
                        longitude: mapJob.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }
                    : defaultRegion
                }
              >
                <Marker
                  coordinate={{
                    latitude: mapJob.latitude || defaultRegion.latitude,
                    longitude: mapJob.longitude || defaultRegion.longitude,
                  }}
                />
              </MapView>
              <TouchableOpacity style={s.mapClose} onPress={() => setMapJob(null)}>
                <MaterialCommunityIcons name="close-circle" size={36} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* ---------- tarjeta individual ---------- */
function Card({
  job,
  onSwipeLeft,
  onSwipeRight,
  onMapPress,
}: {
  job: Job;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onMapPress: () => void;
}) {
  return (
    <View style={s.cardWrapper}>
      <ImageBackground
        source={{ uri: job.imageUrl }}
        style={s.card}
        imageStyle={s.cardImage}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={s.gradient}
        />
        <View style={s.actionsOverlay}>
          {ICONS.map((icon, idx) => {
            const handler =
              icon === 'heart'
                ? onSwipeRight
                : icon === 'close'
                ? onSwipeLeft
                : icon === 'map'
                ? onMapPress
                : () => {};
            return (
              <TouchableOpacity key={idx} style={s.btnSmall} onPress={handler}>
                <MaterialCommunityIcons
                  name={icon as any}
                  size={28}
                  color={
                    icon === 'rewind'
                      ? '#F5B642'
                      : icon === 'close'
                      ? '#FF5B5B'
                      : icon === 'star-outline'
                      ? '#4D8EFF'
                      : icon === 'heart'
                      ? '#4EFF82'
                      : '#C766FF'
                  }
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={s.infoBtn}>
          <MaterialCommunityIcons name="information" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.details}>
          <Text style={s.name}>{job.title}</Text>
          <Text style={s.sub}>
            {job.pay} • {job.duration}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
}

/* ---------- estilos ---------- */
const { width, height } = Dimensions.get('window');

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  finalText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  cardWrapper: {
    width: width - 40,
    height: height * 0.75,
    alignSelf: 'center',
    marginTop: 20,
  },
  card: { flex: 1, justifyContent: 'flex-end' },
  cardImage: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  infoBtn: { position: 'absolute', top: 16, right: 16 },
  details: { padding: 20 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  sub: { color: '#ddd', fontSize: 16, marginTop: 4 },

  actionsOverlay: {
    position: 'absolute',
    bottom: height * 0.15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    zIndex: 10,
  },
  btnSmall: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    width: width - 40,
    height: height * 0.6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 18,
    padding: 4,
  },
});
