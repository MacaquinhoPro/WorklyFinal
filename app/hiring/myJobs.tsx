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
} from 'firebase/firestore';
import { router } from 'expo-router';

/* ───── tipos ───────────────────────────────────────── */
type Job = {
  id: string;
  title: string;
  pay: string;
  duration: string;
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
    setSelectedJob(job);
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
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList data={jobs} keyExtractor={(j) => j.id} renderItem={renderJob} />

      {/* ─── modal puesto y postulantes ───────────────── */}
      <Modal visible={selectedJob != null} animationType="slide">
        <View style={{ flex: 1, padding: 20 }}>
          <Button title="Cerrar" onPress={() => setSelectedJob(null)} />

          {selectedJob && (
            <>
              <Text style={s.modalTitle}>{selectedJob.title}</Text>

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
      </Modal>
    </View>
  );
}

/* ───── estilos ─────────────────────────────────────── */
const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginVertical: 10 },

  /* lista postulantes */
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  appName: { flex: 1, fontSize: 16 },
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
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
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
  backgroundColor:
    status === 'waiting'
      ? '#ffa726'
      : status === 'accepted'
      ? '#66bb6a'
      : status === 'rejected'
      ? '#ef5350'
      : '#90a4ae',
});
