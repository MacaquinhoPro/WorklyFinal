import React, { useEffect, useState, useRef } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  ImageBackground,
  Linking,
  Alert,
  ScrollView,
  TextInput,
  StyleProp,
  TextStyle,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import { db, auth } from '../utils/firebaseconfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
} from 'firebase/firestore';

/* ─── tipos ─────────────────────────────── */
type Job = {
  id: string;
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string[];
  imageUrl: string;
  latitude?: number;
  longitude?: number;
};

type Applicant = {
  appId: string;
  userId: string;
  status: string;
  name: string;
  email: string;
  photoURL?: string;
  description?: string;
  resumeURL?: string;
  experienceYears?: number | null;
};

/* ─── componente ────────────────────────── */
export default function MyJobs() {
  /* --- estado principal --- */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  /* --- scheduler --- */
  const [scheduleModal, setScheduleModal] = useState({
    visible: false,
    app: null as Applicant | null,
    date: '',
    time: '',
  });
  const [schedulerActive, setSchedulerActive] = useState(false);
  const [picker, setPicker] = useState<{ visible: boolean; mode: 'date' | 'time' }>({
    visible: false,
    mode: 'date',
  });

  /* --- feedback banner --- */
  const [feedback, setFeedback] = useState({
    visible: false,
    text: '',
    color: '#66bb6a' as string | string[],
  });
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const showFeedback = (msg: string, color: string | string[]) => {
    setFeedback({ visible: true, text: msg, color });
    feedbackOpacity.setValue(0);
    Animated.timing(feedbackOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(
      () => {
        setTimeout(() => {
          Animated.timing(feedbackOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
            () => setFeedback(f => ({ ...f, visible: false }))
          );
        }, 1500);
      }
    );
  };

  /* --- listener trabajos del hiring --- */
  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('ownerUid', '==', auth.currentUser!.uid));
    const unsub = onSnapshot(q, snap => {
      setJobs(
        snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as any),
          description: (d.data() as any).description ?? '',
        })) as Job[]
      );
    });
    return () => unsub();
  }, []);

  /* --- listener de postulaciones por job --- */
  const appsUnsubRef = useRef<(() => void) | null>(null) as React.MutableRefObject<(() => void) | null>;

  const openJob = async (job: Job) => {
    /* cancela listener previo */
    if (appsUnsubRef.current) {
      appsUnsubRef.current();
      appsUnsubRef.current = null;
    }

    /* carga detalles de job (por si falta algo) */
    try {
      const snap = await getDoc(doc(db, 'jobs', job.id));
      setSelectedJob(
        snap.exists()
          ? { ...job, ...(snap.data() as any), description: (snap.data() as any).description ?? job.description }
          : job
      );
    } catch (e) {
      setSelectedJob(job);
    }

    setSelectedApplicant(null);
    setLoadingApplicants(true);

    /* listener realtime de applications */
    const q = query(collection(db, 'applications'), where('jobId', '==', job.id));
    appsUnsubRef.current = onSnapshot(
      q,
      async snap => {
        try {
          const baseApps = snap.docs.map(d => {
            const data = d.data() as any;
            return {
              appId: d.id,
              userId: data.userId,
              status: data.status,
              name: data.name,
              email: data.email,
              photoURL: data.photoURL || '',
              description: data.description || '',
              resumeURL: data.resumeURL || '',
              experienceYears: data.experienceYears ?? null,
            } as Applicant;
          });

          /* completa info faltante desde users */
          const enriched = await Promise.all(
            baseApps.map(async a => {
              if (a.photoURL && a.resumeURL) return a;
              try {
                let uSnap = await getDoc(doc(db, 'users', a.userId));
                if (!uSnap.exists()) {
                  const qs = await getDocs(query(collection(db, 'users'), where('uid', '==', a.userId)));
                  if (!qs.empty) uSnap = qs.docs[0];
                }
                if (uSnap.exists()) {
                  const u = uSnap.data() as any;
                  return {
                    ...a,
                    photoURL: a.photoURL || u.photoURL || '',
                    description: a.description || u.description || '',
                    resumeURL: a.resumeURL || u.cvURL || u.resumeURL || u.cv || '',
                  };
                }
              } catch (_) {}
              return a;
            })
          );

          setApplicants(enriched);
        } catch (err) {
          console.error(err);
          Alert.alert('Error', 'No se pudieron cargar postulantes.');
          setApplicants([]);
        } finally {
          setLoadingApplicants(false);
        }
      },
      err => {
        console.error(err);
        Alert.alert('Error', 'No se pudieron cargar postulantes.');
        setLoadingApplicants(false);
      }
    );
  };

  const closeJobModal = () => {
    if (appsUnsubRef.current) {
      appsUnsubRef.current();
      appsUnsubRef.current = null;
    }
    setSelectedJob(null);
    setApplicants([]);
    setSelectedApplicant(null);
    setLoadingApplicants(false);
  };

  /* --- cambio estado postulante --- */
  const changeStatus = async (app: Applicant, status: string) => {
    try {
      await updateDoc(doc(db, 'applications', app.appId), { status });
      showFeedback(
        status === 'rejected' ? 'Postulante rechazado' : 'Postulante marcado para entrevista',
        status === 'rejected' ? '#e53935' : ['#5A40EA', '#EE805F']
      );
      setSelectedApplicant(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  /* --- programar entrevista --- */
  const scheduleInterview = async () => {
    const { app, date, time } = scheduleModal;
    if (!app || !date || !time) return;
    try {
      const ts = new Date(`${date}T${time}:00`).getTime();
      await updateDoc(doc(db, 'applications', app.appId), {
        status: 'waiting',
        interviewAt: ts,
      });
      showFeedback('Entrevista programada', ['#5A40EA', '#EE805F']);
      setScheduleModal({ visible: false, app: null, date: '', time: '' });
      setSchedulerActive(false);
      setSelectedApplicant(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  /* --- eliminar trabajo --- */
  const deleteJob = async (id: string) => {
    await deleteDoc(doc(db, 'jobs', id));
    closeJobModal();
  };

  /* --- edición trabajo --- */
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editFields, setEditFields] = useState({
    title: '',
    pay: '',
    duration: '',
    requirementsText: '',
  });

  const handleEdit = (job: Job) => {
    setEditJob(job);
    setEditFields({
      title: job.title,
      pay: job.pay,
      duration: job.duration,
      requirementsText: job.requirements.join(', '),
    });
  };

  const saveEdit = async () => {
    if (!editJob) return;
    try {
      const reqs = editFields.requirementsText.split(',').map(t => t.trim()).filter(Boolean);
      await updateDoc(doc(db, 'jobs', editJob.id), {
        title: editFields.title,
        pay: editFields.pay,
        duration: editFields.duration,
        requirements: reqs,
      });
      setEditJob(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  /* --- render tarjetas de job --- */
  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity style={s.cardWrapper} activeOpacity={0.8} onPress={() => openJob(item)}>
      <ImageBackground source={{ uri: item.imageUrl }} style={s.card} imageStyle={s.cardImage}>
        <View style={s.cardOverlay}>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
          <Text style={s.subtitle}>{item.duration} • {item.pay}</Text>
          <View style={s.row}>
            <Button title="Editar" onPress={() => handleEdit(item)} />
            <Button title="Eliminar" color="red" onPress={() => deleteJob(item.id)} />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  /* --- header detalle job --- */
  const JobDetailHeader = () => {
    if (!selectedJob) return null;
    return (
      <>
        {selectedJob.imageUrl && <Image source={{ uri: selectedJob.imageUrl }} style={s.detailImage} />}
        <Text style={s.modalTitle}>{selectedJob.title}</Text>
        <Text style={s.detailDescription}>{selectedJob.description}</Text>
        <Text style={s.detailText}>Salario: {selectedJob.pay}</Text>
        <Text style={s.detailText}>Duración: {selectedJob.duration}</Text>
        <View style={s.detailList}>
          <Text style={s.detailText}>Requisitos:</Text>
          {selectedJob.requirements.map((r, i) => <Text key={i} style={s.detailText}>• {r}</Text>)}
        </View>
        <MapView
          style={s.detailMap}
          pointerEvents="none"
          initialRegion={{
            latitude: selectedJob.latitude ?? 4.711,
            longitude: selectedJob.longitude ?? -74.0721,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={{
            latitude: selectedJob.latitude ?? 4.711,
            longitude: selectedJob.longitude ?? -74.0721,
          }} />
        </MapView>
        <Text style={[s.modalTitle, { marginTop: 12 }]}>Postulantes</Text>
      </>
    );
  };

  /* --- render postulante --- */
  const renderApplicant = ({ item }: { item: Applicant }) => (
    <TouchableOpacity style={s.appItem} onPress={() => setSelectedApplicant(item)}>
      {item.photoURL
        ? <Image source={{ uri: item.photoURL }} style={s.appAvatar} />
        : <Ionicons name="person-circle" size={48} color="#bbb" style={s.appAvatar} />}
      <View style={{ flex: 1 }}>
        <Text style={s.appName}>{item.name}</Text>
        <Text style={s.appemail}>{item.email}</Text>
      </View>
      <Text style={badgeStyle(item.status)}>{item.status.toUpperCase()}</Text>
    </TouchableOpacity>
  );

  /* --- render principal --- */
  return (
    <SafeAreaView style={s.container}>
      {jobs.length === 0 ? (
        <View style={s.noJobsContainer}>
          <Text style={s.noJobsText}>
            ¡Aún no tienes trabajos publicados!{'\n'}Presiona “Publicar” para crear uno.
          </Text>
        </View>
      ) : (
        <FlatList data={jobs} keyExtractor={j => j.id} renderItem={renderJob} />
      )}

      {/* ---- Modal detalle job ---- */}
      <Modal visible={!!selectedJob} animationType="slide" onRequestClose={closeJobModal}>
        <SafeAreaView style={s.modalContainer}>
          <TouchableOpacity style={s.backButton} onPress={closeJobModal}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* feedback */}
          {feedback.visible && (
            <Animated.View style={[s.feedbackInModal, { opacity: feedbackOpacity }]}>
              {Array.isArray(feedback.color)
                ? <LinearGradient colors={feedback.color as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
                : <View style={[StyleSheet.absoluteFill, { backgroundColor: feedback.color as string, borderRadius: 20 }]} />}
              <Text style={s.feedbackText}>{feedback.text}</Text>
            </Animated.View>
          )}

          <View style={s.modalContent}>
            {selectedJob && (
              selectedApplicant ? (
                /* ---- detalle de un postulante ---- */
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <View style={s.appDetailCard}>
                    {selectedApplicant.photoURL
                      ? <Image source={{ uri: selectedApplicant.photoURL }} style={s.appPhoto} />
                      : <Ionicons name="person-circle" size={180} color="#bbb" style={s.appPhoto} />}
                    <Text style={s.detailName}>{selectedApplicant.name}</Text>
                    <Text style={s.detailText}>Correo: {selectedApplicant.email}</Text>
                    {selectedApplicant.description && <Text style={s.detailText}>{selectedApplicant.description}</Text>}

                    {/* CV */}
                    {selectedApplicant.resumeURL
                      ? (
                        <TouchableOpacity style={s.cvBox} onPress={() => Linking.openURL(selectedApplicant.resumeURL!)}>
                          <Ionicons name="document-attach-outline" size={28} color="#E23D3D" />
                          <Text style={s.cvName}>Ver CV (PDF)</Text>
                        </TouchableOpacity>
                      )
                      : <Text style={s.noCvText}>Sin hoja de vida</Text>}

                    <View style={s.divider} />

                    {/* botones */}
                    {schedulerActive ? (
                      <>
                        <TouchableOpacity style={s.input} onPress={() => setPicker({ visible: true, mode: 'date' })}>
                          <Text style={{ color: scheduleModal.date ? '#000' : '#888' }}>{scheduleModal.date || 'Elegir fecha'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.input} onPress={() => setPicker({ visible: true, mode: 'time' })}>
                          <Text style={{ color: scheduleModal.time ? '#000' : '#888' }}>{scheduleModal.time || 'Elegir hora'}</Text>
                        </TouchableOpacity>
                        <View style={s.detailButtons}>
                          <Button title="Cancelar" onPress={() => setSchedulerActive(false)} />
                          <Button title="Guardar" onPress={scheduleInterview} />
                        </View>
                      </>
                    ) : (
                      <View style={s.detailButtons}>
                        <Button title="Rechazar" color="#e53935" onPress={() => changeStatus(selectedApplicant, 'rejected')} />
                        <Button
                          title="Entrevista"
                          color="#fb8c00"
                          onPress={() => {
                            setSchedulerActive(true);
                            setScheduleModal({
                              visible: false,
                              app: selectedApplicant,
                              date: new Date().toISOString().split('T')[0],
                              time: '',
                            });
                          }}
                        />
                      </View>
                    )}
                    <Button title="Volver a lista" onPress={() => setSelectedApplicant(null)} />
                  </View>
                </ScrollView>
              ) : loadingApplicants ? (
                <ActivityIndicator size="large" style={{ marginTop: 40 }} />
              ) : (
                <FlatList
                  data={applicants}
                  keyExtractor={a => a.appId}
                  renderItem={renderApplicant}
                  ListHeaderComponent={JobDetailHeader}
                  contentContainerStyle={{ paddingBottom: 24 }}
                />
              )
            )}
          </View>

          {/* DateTimePicker inline */}
          {picker.visible && (
            <DateTimePicker
              value={new Date()}
              mode={picker.mode}
              display={Platform.OS === 'ios'
                ? picker.mode === 'date'
                  ? 'inline'
                  : 'spinner'
                : 'default'}
              style={Platform.OS === 'ios'
                ? { width: '60%', height: 100, transform: [{ scale: 0.8 }], alignSelf: 'center' }
                : { width: '60%', transform: [{ scale: 0.9 }], alignSelf: 'center' }}
              onChange={(_, sel) => {
                if (!sel) { setPicker({ ...picker, visible: false }); return; }
                if (picker.mode === 'date') {
                  setScheduleModal(p => ({ ...p, date: sel.toISOString().split('T')[0] }));
                  setPicker({ visible: false, mode: 'time' });
                } else {
                  const hh = String(sel.getHours()).padStart(2, '0');
                  const mm = String(sel.getMinutes()).padStart(2, '0');
                  setScheduleModal(p => ({ ...p, time: `${hh}:${mm}` }));
                  setPicker({ visible: false, mode: 'date' });
                }
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ---- Modal edición trabajo ---- */}
      <Modal transparent animationType="fade" visible={!!editJob}>
        <View style={s.editOverlay}>
          <View style={s.editContainer}>
            <ScrollView>
              <Text style={s.modalTitle}>Editar Puesto</Text>
              <TextInput style={s.input} placeholder="Título" value={editFields.title} onChangeText={t => setEditFields(f => ({ ...f, title: t }))} />
              <TextInput style={s.input} placeholder="Salario" value={editFields.pay} onChangeText={t => setEditFields(f => ({ ...f, pay: t }))} />
              <TextInput style={s.input} placeholder="Duración" value={editFields.duration} onChangeText={t => setEditFields(f => ({ ...f, duration: t }))} />
              <TextInput
                style={[s.input, { height: 80 }]}
                placeholder="Requisitos (separados por coma)"
                multiline
                value={editFields.requirementsText}
                onChangeText={t => setEditFields(f => ({ ...f, requirementsText: t }))}
              />
              <View style={s.detailButtons}>
                <Button title="Cancelar" onPress={() => setEditJob(null)} />
                <Button title="Guardar" onPress={saveEdit} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ─── estilos ───────────────────────────── */
const s = StyleSheet.create({
  /* … mismos estilos que antes … */
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: getStatusBarHeight(true), paddingHorizontal: 16 },
  noJobsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noJobsText: { fontSize: 18, color: '#444', textAlign: 'center', paddingHorizontal: 20 },
  cardWrapper: { marginVertical: 8, marginHorizontal: 8, borderRadius: 12, overflow: 'hidden', elevation: 3 },
  card: { width: '100%', height: 180, justifyContent: 'flex-end' },
  cardImage: { resizeMode: 'cover' },
  cardOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  desc: { color: '#eee', fontSize: 14, marginBottom: 4 },
  subtitle: { color: '#eee', fontSize: 14, marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalContainer: { flex: 1, backgroundColor: '#f0f2f5', paddingTop: getStatusBarHeight(true) + 8 },
  backButton: { position: 'absolute', top: getStatusBarHeight(true) + 32, left: 16, padding: 8, zIndex: 10 },
  modalContent: { flex: 1, backgroundColor: '#fff', marginTop: getStatusBarHeight(true) + 8, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, elevation: 4 },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  detailDescription: { fontSize: 16, color: '#555', marginBottom: 12 },
  detailText: { fontSize: 16, color: '#444', marginBottom: 8 },
  detailList: { marginBottom: 12 },
  detailMap: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  detailImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 16 },
  detailName: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  detailButtons: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  appPhoto: { width: 180, height: 180, borderRadius: 90, alignSelf: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#ddd' },
  appDetailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  divider: { borderBottomWidth: 1, borderBottomColor: '#eee', marginVertical: 16 },
  appItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  appAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  appName: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  appemail: { fontSize: 14, color: '#333' },
  feedbackInModal: { position: 'absolute', top: getStatusBarHeight(true) + 60, left: 20, right: 20, borderRadius: 20, paddingVertical: 10, alignItems: 'center', elevation: 4, zIndex: 50 },
  feedbackText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cvBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, width: '100%', elevation: 2, marginBottom: 20 },
  cvName: { marginLeft: 12, fontSize: 15, fontWeight: '500', color: '#333' },
  noCvText: { fontSize: 14, color: '#666', marginBottom: 20, alignSelf: 'center' },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editContainer: { width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '80%' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12, justifyContent: 'center' },
});

/* badge */
const badgeStyle = (status: string): StyleProp<TextStyle> => ({
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  color: '#fff',
  fontSize: 12,
  marginLeft: 12,
  backgroundColor:
    status === 'waiting' ? '#ffa726' :
    status === 'accepted' ? '#66bb6a' :
    status === 'rejected' ? '#ef5350' :
    '#90a4ae',
});
