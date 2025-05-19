import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  ImageBackground,
  Modal,
  Alert,
  Animated,
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
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';

const ICONS = ['close', 'heart', 'map'];

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
  const [jobsRaw, setJobsRaw] = useState<Job[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const swiperRef = useRef<any>(null);
  const [mapJob, setMapJob] = useState<Job | null>(null);

  /* —— flash global —— */
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState<
    'rgba(178, 255, 201, 0.45)' | 'rgba(255,91,91,0.45)' | null
  >(null);

  const triggerFlash = (type: 'green' | 'red') => {
    const color =
      type === 'green'
        ? 'rgba(178, 255, 201, 0.45)'
        : 'rgba(255,91,91,0.45)';

    setFlashColor(color);
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 2000,
      useNativeDriver: true,
    }).start(() => setFlashColor(null));
  };

  /* —— datos —— */
  const defaultRegion = {
    latitude: 4.711,
    longitude: -74.0721,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobsRaw(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

  const cards = useMemo(
    () => jobsRaw.filter((j) => !appliedIds.has(j.id)),
    [jobsRaw, appliedIds]
  );

  /* —— postular —— */
  const apply = async (job: Job) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      /* lee perfil del usuario para obtener CV y otros datos */
      const uSnap = await getDoc(doc(db, 'users', user.uid));
      const u = uSnap.exists() ? (uSnap.data() as any) : {};

      const cvURL = u.cvURL || u.resumeURL || u.cv || '';
      if (!cvURL) {
        Alert.alert(
          'CV faltante',
          'Debes subir tu hoja de vida en tu perfil antes de postularte.'
        );
        return;
      }

      await setDoc(
        doc(db, 'applications', `${job.id}_${user.uid}`),
        {
          jobId: job.id,
          userId: user.uid,
          status: 'pending',
          createdAt: Date.now(),
          /* datos del usuario para el hiring */
          name: user.displayName || u.displayName || 'Anónimo',
          email: user.email || u.email || 'Sin correo',
          photoURL: user.photoURL || u.photoURL || '',
          description: u.description || '',
          resumeURL: cvURL,
          /* caché del trabajo */
          title: job.title,
          jobDescription: job.description,
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Error al postularse:', e);
      Alert.alert('Error', 'No se pudo completar la postulación.');
    }
  };

  /* —— UI —— */
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.finalText}>
          No hay más ofertas nuevas por ahora. ¡Vuelve más tarde!
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container} key={cards.length}>
      {/* Flash */}
      {flashColor && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: flashColor, opacity: flashOpacity },
          ]}
        />
      )}

      {/* Swiper */}
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
        onSwipedRight={(i) => {
          apply(cards[i]);
          triggerFlash('green');
        }}
        onSwipedLeft={() => triggerFlash('red')}
        disableLeftSwipe={!!mapJob}
        disableRightSwipe={!!mapJob}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={15}
        animateOverlayLabelsOpacity
        overlayLabels={{
          left: {
            element: (
              <View style={s.overlayIcon}>
                <MaterialCommunityIcons
                  name="close"
                  size={160}
                  color="#FF5B5B"
                />
              </View>
            ),
            style: { wrapper: s.overlayWrapperLeft },
          },
          right: {
            element: (
              <View style={s.overlayIcon}>
                <MaterialCommunityIcons
                  name="check"
                  size={160}
                  color="#4EFF82"
                />
              </View>
            ),
            style: { wrapper: s.overlayWrapperRight },
          },
        }}
      />

      {/* Mapa */}
      {mapJob && (
        <Modal transparent animationType="slide" visible>
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
              <TouchableOpacity
                style={s.mapClose}
                onPress={() => setMapJob(null)}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={36}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function Card({ job, onSwipeLeft, onSwipeRight, onMapPress }: any) {
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
                : onMapPress;
            const color =
              icon === 'close'
                ? '#FF5B5B'
                : icon === 'heart'
                ? '#4EFF82'
                : '#C766FF';

            return (
              <TouchableOpacity
                key={idx}
                style={s.btnSmall}
                onPress={handler}
              >
                <MaterialCommunityIcons
                  name={icon as any}
                  size={28}
                  color={color}
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

/* —— estilos —— */
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
  card: { flex: 1, justifyContent: 'flex-end', position: 'relative' },
  cardImage: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  infoBtn: { position: 'absolute', top: 16, right: 16, zIndex: 15 },
  details: { padding: 20 },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  sub: { color: '#ddd', fontSize: 16, marginTop: 4 },
  actionsOverlay: {
    position: 'absolute',
    bottom: height * 0.15,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    zIndex: 15,
  },
  btnSmall: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  overlayWrapperLeft: {
    position: 'absolute',
    left: -width * 0.4,
    width,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  overlayWrapperRight: {
    position: 'absolute',
    right: -width * 0.4,
    width,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  overlayIcon: {
    pointerEvents: 'none',
    justifyContent: 'center',
    alignItems: 'center',
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
