import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Button,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  ScrollView,
  StyleProp,
  TextStyle,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import { db, auth } from '../utils/firebaseconfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { router } from 'expo-router';

/* ───── tipos ───────────────────────────────────────── */
type Job = {
  id: string;
  title: string;
  pay: string;
  duration: string;
  requirements: string[];
  latitude?: number;
  longitude?: number;
};

type Applicant = {
  appId: string;
  userId: string;
  status: string;
  name: string;
  experienceYears?: number | null;
  email: string;
  photoURL?: string;
  description?: string;
  resumeURL?: string;
};

/* ───── componente ─────────────────────────────────── */
export default function MyJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedApplicant, setSelectedApplicant] =
    useState<Applicant | null>(null);

  /* ───── escuchar mis puestos ───────────────────────── */
  useEffect(() => {
    const q = query(
      collection(db, 'jobs'),
      where('ownerUid', '==', auth.currentUser!.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr: Job[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setJobs(arr);
    });
    return () => unsub();
  }, []);

  /* ───── cargar postulantes ────────────────────────── */
  const openJob = async (job: Job) => {
    const jobSnapFull = await getDoc(doc(db, 'jobs', job.id));
    let fullData: any = {};
    if (jobSnapFull.exists()) {
      fullData = jobSnapFull.data();
    }
    setSelectedJob({ ...job, ...fullData });
    setSelectedApplicant(null);
    setLoadingApplicants(true);

    const qs = await getDocs(
      query(collection(db, 'applications'), where('jobId', '==', job.id))
    );

    const array: Applicant[] = qs.docs.map((d) => {
      const data: any = d.data();
      return {
        appId: d.id,
        userId: data.userId,
        status: data.status,
        name: data.name || 'N/A',
        experienceYears: data.experienceYears ?? null,
        email: data.email || 'N/A',
        photoURL: data.photoURL,
        description: data.descriptionUser || data.description || '',
        resumeURL: data.resumeURL || '',
      };
    });

    setApplicants(array);
    setLoadingApplicants(false);
  };

  /* ───── cambiar estado ────────────────────────────── */
  const changeStatus = async (app: Applicant, status: string) => {
    try {
      await updateDoc(doc(db, 'applications', app.appId), { status });
      setApplicants((prev) =>
        prev.map((a) => (a.appId === app.appId ? { ...a, status } : a))
      );
      setSelectedApplicant(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  /* ───── eliminar puesto ───────────────────────────── */
  const deleteJob = async (jobId: string) => {
    await deleteDoc(doc(db, 'jobs', jobId));
  };

  /* ───── render puesto ─────────────────────────────── */
  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity style={s.card} onPress={() => openJob(item)}>
      <Text style={s.title}>{item.title}</Text>
      <Text>{item.duration}</Text>
      <Text>{item.pay}</Text>
      <View style={s.row}>
        <Button
          title="Editar"
          onPress={() =>
            router.push({ pathname: '/hiring/publish', params: { jobId: item.id } })
          }
        />
        <Button title="Eliminar" color="red" onPress={() => deleteJob(item.id)} />
      </View>
    </TouchableOpacity>
  );

  /* ───── render postulante en lista ────────────────── */
  const renderApplicant = ({ item }: { item: Applicant }) => (
    <TouchableOpacity
      style={s.appItem}
      onPress={() => setSelectedApplicant(item)}
    >
      <Text style={s.appName}>{item.name}</Text>
      <Text style={s.appemail}>{item.email}</Text>
      <Text style={badgeStyle(item.status)}>{item.status.toUpperCase()}</Text>
    </TouchableOpacity>
  );

  /* ───── UI principal ─────────────────────────────── */
  return (
    <SafeAreaView style={s.container}>
      <FlatList data={jobs} keyExtractor={(j) => j.id} renderItem={renderJob} />

      {/* ─── modal puesto y postulantes ───────────────── */}
      <Modal visible={selectedJob != null} animationType="slide">
        <SafeAreaView style={s.modalContainer}>
          <TouchableOpacity style={s.backButton} onPress={() => setSelectedJob(null)}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={s.modalContent}>
          {selectedJob && (
            <>
              <Text style={s.modalTitle}>{selectedJob.title}</Text>
              <Text style={s.detailText}>Salario: {selectedJob.pay}</Text>
              <Text style={s.detailText}>Duración: {selectedJob.duration}</Text>
              <View style={s.detailList}>
                <Text style={s.detailText}>Requisitos:</Text>
                {selectedJob.requirements.map((req, i) => (
                  <Text key={i} style={s.detailText}>• {req}</Text>
                ))}
              </View>
              <MapView
                style={s.detailMap}
                initialRegion={{
                  latitude: selectedJob.latitude ?? 4.7110,
                  longitude: selectedJob.longitude ?? -74.0721,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: selectedJob.latitude ?? 4.7110,
                    longitude: selectedJob.longitude ?? -74.0721,
                  }}
                />
              </MapView>

              {loadingApplicants ? (
                <ActivityIndicator size="large" />
              ) : selectedApplicant ? (
                /* ─── detalle postulante ─────── */
                <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
                  {selectedApplicant.photoURL && (
                    <Image
                      source={{ uri: selectedApplicant.photoURL }}
                      style={s.appPhoto}
                    />
                  )}
                  <Text style={s.detailName}>{selectedApplicant.name}</Text>
                  <Text style={s.detailText}>
                    Correo: {selectedApplicant.email}
                  </Text>
                  {selectedApplicant.description && (
                    <Text style={s.detailText}>
                      {selectedApplicant.description}
                    </Text>
                  )}
                  {selectedApplicant.resumeURL ? (
                    <Text
                      style={[
                        s.detailText,
                        {
                          color: '#1e88e5',
                          textDecorationLine: 'underline',
                        },
                      ]}
                      onPress={() =>
                        Linking.openURL(selectedApplicant.resumeURL!)
                      }
                    >
                      Ver hoja de vida
                    </Text>
                  ) : (
                    <Text style={s.detailText}>Sin hoja de vida</Text>
                  )}

                  <View style={s.detailButtons}>
                    <Button
                      title="Rechazar"
                      color="#e53935"
                      onPress={() =>
                        changeStatus(selectedApplicant, 'rejected')
                      }
                    />
                    <Button
                      title="Entrevista"
                      color="#fb8c00"
                      onPress={() =>
                        changeStatus(selectedApplicant, 'waiting')
                      }
                    />
                  </View>
                  <Button
                    title="Volver a lista"
                    onPress={() => setSelectedApplicant(null)}
                  />
                </ScrollView>
              ) : applicants.length === 0 ? (
                <Text>No hay postulantes</Text>
              ) : (
                <FlatList
                  data={applicants}
                  keyExtractor={(a) => a.appId}
                  renderItem={renderApplicant}
                />
              )}
            </>
          )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/* ───── estilos ─────────────────────────────────────── */
const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: getStatusBarHeight(true),
    backgroundColor: '#f5f5f5',
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: getStatusBarHeight(true) + 8,
    backgroundColor: '#f0f2f5',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginTop: 80,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android elevation
    elevation: 4,
  },
  backButton: {
    position: 'absolute',
    top: getStatusBarHeight(true) + 32,
    left: 16,
    padding: 8,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginVertical: 8,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android elevation
    elevation: 3,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalTitle: { 
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },

  /* lista postulantes */
  appItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android elevation
    elevation: 2,
  },
  appName: { flex: 1, fontSize: 16, fontWeight: '500' },
  appemail: { fontSize: 14, color: '#666' },
  appExp: { width: 110, fontSize: 14, color: '#666' },

  /* detalle postulante */
  appPhoto: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: 'center',
    marginBottom: 20,
  },
  detailName: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    width: '100%',
    textAlign: 'left',
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
  detailButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
});

/* ───── badge dinámico ─────────────────────────────── */
const badgeStyle = (status: string): StyleProp<TextStyle> => ({
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  overflow: 'hidden',
  color: '#fff',
  fontSize: 12,
  marginLeft: 12,
  backgroundColor:
    status === 'waiting'
      ? '#ffa726'
      : status === 'accepted'
      ? '#66bb6a'
      : status === 'rejected'
      ? '#ef5350'
      : '#90a4ae',
});
