import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ImageBackground,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';

const ICONS = ['rewind', 'close', 'star-outline', 'heart', 'flash'];

type Job = {
  id: string;
  imageUrl: string;       // Asegúrate de añadir este campo en Firestore
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
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobs'), snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
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
      title: job.title,
      description: job.description,
    });
    Alert.alert('¡Listo!', `Te postulaste a ${job.title}`);
  };

  const reject = (job: Job) => {
    Alert.alert('Oferta descartada', `Descartaste ${job.title}`);
    setCards(prev => prev.filter(c => c.id !== job.id));
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" /></View>;
if (!cards.length) {
  return (
    <View style={[s.container, s.center]}>
      <Text style={s.finalText}>
        Vuelve más tarde para descubrir nuevas oportunidades.
      </Text>
    </View>
  );
}

  return (
    <View style={s.container}>
      <Swiper
        ref={swiperRef}
        cards={cards}
        renderCard={job => (
          <Card
            job={job}
            onSwipeLeft={() => swiperRef.current?.swipeLeft()}
            onSwipeRight={() => swiperRef.current?.swipeRight()}
          />
        )}
        onSwipedRight={i => apply(cards[i])}
        onSwipedLeft={i => reject(cards[i])}
        backgroundColor="transparent"
        stackSize={3}
        stackSeparation={15}
        overlayLabels={{
          left: {
            title: 'NOPE',
            style: { label: { color: '#FF5B5B', fontSize: 32, borderWidth: 2, borderColor: '#FF5B5B' } }
          },
          right: {
            title: 'LIKE',
            style: { label: { color: '#4EFF82', fontSize: 32, borderWidth: 2, borderColor: '#4EFF82' } }
          },
        }}
      />
    </View>
  );
}

function Card({ job, onSwipeLeft, onSwipeRight }: { job: Job; onSwipeLeft: () => void; onSwipeRight: () => void }) {
  return (
    <View style={s.cardWrapper}>
      <ImageBackground
        source={{ uri: job.imageUrl }}
        style={s.card}
        imageStyle={s.cardImage}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={s.gradient}
        />
        <View style={s.actionsOverlay}>
          {ICONS.map((icon, idx) => {
            const handler =
              icon === 'heart' ? onSwipeRight :
              icon === 'close' ? onSwipeLeft :
              () => {};
            return (
              <TouchableOpacity key={idx} style={s.btnSmall} onPress={handler}>
                <MaterialCommunityIcons
                  name={icon as any}
                  size={28}
                  color={
                    icon === 'rewind' ? '#F5B642' :
                    icon === 'close' ? '#FF5B5B' :
                    icon === 'star-outline' ? '#4D8EFF' :
                    icon === 'heart' ? '#4EFF82' :
                    '#C766FF'
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
          <Text style={s.sub}>{job.pay} • {job.duration}</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  finalText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  /* CARD smaller card */
  cardWrapper: {
    width: width - 40,
    height: height * 0.75,
    alignSelf: 'center',
    marginTop: 20,
  },
  card: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardImage: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  infoBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  details: {
    padding: 20,
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sub: {
    color: '#ddd',
    fontSize: 16,
    marginTop: 4,
  },

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
});