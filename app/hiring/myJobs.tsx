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
  Platform,
  SafeAreaView,
  Animated,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import { db, auth } from '../utils/firebaseconfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
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
  status: 'pending' | 'waiting' | 'accepted' | 'rejected';
  name: string;
  email: string;
  photoURL?: string;
  description?: string;
  resumeURL?: string;
  experienceYears?: number | null;
  pushToken?: string;
};

/* ─── componente principal ───────────────── */
export default function MyJobs() {
  /* --- estado --- */
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(
    null
  );

  /* --- programación de entrevista --- */
  const [scheduleModal, setScheduleModal] = useState<{
    visible: boolean;
    app: Applicant | null;
    date: string;
    time: string;
  }>({ visible: false, app: null, date: '', time: '' });
  const [schedulerActive, setSchedulerActive] = useState(false);
  const [picker, setPicker] = useState<{ visible: boolean; mode: 'date' | 'time' }>({
    visible: false,
    mode: 'date',
  });

  /* --- feedback (banner) --- */
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    text: string;
    color: string | string[];
  }>({ visible: false, text: '', color: '#66bb6a' });
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const showFeedback = (msg: string, color: string | string[]) => {
    setFeedback({ visible: true, text: msg, color });
    feedbackOpacity.setValue(0);
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setFeedback((f) => ({ ...f, visible: false })));
      }, 1500);
    });
  };

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se pueden enviar notificaciones de rechazo.');
      }
    })();
  }, []);

  /* --- cargar trabajos del hiring --- */
  useEffect(() => {
    const q = query(
      collection(db, 'jobs'),
      where('ownerUid', '==', auth.currentUser!.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setJobs(
        snap.docs.map(
          (d) =>
            ({
              id: d.id,
              ...(d.data() as any),
              description: (d.data() as any).description ?? '',
            } as Job)
        )
      );
    });
    return () => unsub();
  }, []);

  /* --- listener de postulaciones por job --- */
  const appsUnsubRef = useRef<(() => void) | null>(null) as React.MutableRefObject<(() => void) | null>;

  const openJob = async (job: Job) => {
    /* cancelar listener previo */
    if (appsUnsubRef.current) {
      appsUnsubRef.current();
      appsUnsubRef.current = null;
    }

    /* asegura que tengas la descripción más reciente */
    try {
      const snap = await getDoc(doc(db, 'jobs', job.id));
      setSelectedJob(
        snap.exists()
          ? { ...job, ...(snap.data() as any) }
          : job
      );
    } catch (_) {
      setSelectedJob(job);
    }

    setSelectedApplicant(null);
    setLoadingApplicants(true);

    const q = query(
      collection(db, 'applications'),
      where('jobId', '==', job.id)
    );
    appsUnsubRef.current = onSnapshot(
      q,
      async (snap) => {
        try {
          const base = snap.docs.map((d) => {
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
              pushToken: data.pushToken || '',
            } as Applicant;
          });

          const enriched = await Promise.all(
            base.map(async (a) => {
              if (a.photoURL && a.resumeURL && a.pushToken) return a;
              try {
                let uSnap = await getDoc(doc(db, 'users', a.userId));
                if (!uSnap.exists()) {
                  const qs = await getDocs(
                    query(collection(db, 'users'), where('uid', '==', a.userId))
                  );
                  if (!qs.empty) uSnap = qs.docs[0];
                }
                if (uSnap.exists()) {
                  const u = uSnap.data() as any;
                  return {
                    ...a,
                    photoURL: a.photoURL || u.photoURL || '',
                    description: a.description || u.description || '',
                    resumeURL:
                      a.resumeURL || u.cvURL || u.resumeURL || u.cv || '',
                    pushToken: a.pushToken || u.pushToken || '',
                  };
                }
              } catch (_) {}
              return a;
            })
          );

          // Remover postulantes rechazados de la lista
          setApplicants(enriched.filter(a => a.status !== 'rejected'));
        } catch (err) {
          console.error(err);
          Alert.alert('Error', 'No se pudieron cargar postulantes.');
          setApplicants([]);
        } finally {
          setLoadingApplicants(false);
        }
      },
      (err) => {
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

  /* --- cambiar estado de postulante --- */
  const changeStatus = async (app: Applicant, status: Applicant['status']) => {
    try {
      await updateDoc(doc(db, 'applications', app.appId), { status });
      showFeedback(
        status === 'rejected'
          ? 'Postulante rechazado'
          : 'Postulante marcado para entrevista',
        status === 'rejected' ? '#e53935' : ['#5A40EA', '#EE805F']
      );
      // send push notification to the rejected applicant
      if (status === 'rejected' && app.pushToken) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: app.pushToken,
              sound: 'default',
              title: 'Rechazo de Postulación',
              body: `Has sido rechazado al puesto de "${selectedJob?.title || ''}"`,
            }),
          });
        } catch (err) {
          console.error('Error enviando push:', err);
        }
      }
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

  /* --- edición de trabajo --- */
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
      const reqs = editFields.requirementsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
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

  /* --- render tarjeta --- */
  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={s.cardWrapper}
      activeOpacity={0.8}
      onPress={() => openJob(item)}
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
          <View style={s.row}>
            <Button title="Editar" onPress={() => handleEdit(item)} />
            <Button
              title="Eliminar"
              color="red"
              onPress={() => deleteJob(item.id)}
            />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  /* --- cabecera detalle --- */
  const JobDetailHeader = () => {
    if (!selectedJob) return null;
    return (
      <>
        {selectedJob.imageUrl && (
          <Image source={{ uri: selectedJob.imageUrl }} style={s.detailImage} />
        )}
        <Text style={s.modalTitle}>{selectedJob.title}</Text>
        <Text style={s.detailDescription}>{selectedJob.description}</Text>
        <Text style={s.detailText}>Salario: {selectedJob.pay}</Text>
        <Text style={s.detailText}>Duración: {selectedJob.duration}</Text>
        <View style={s.detailList}>
          <Text style={s.detailText}>Requisitos:</Text>
          {selectedJob.requirements.map((r, i) => (
            <Text key={i} style={s.detailText}>
              • {r}
            </Text>
          ))}
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
          <Marker
            coordinate={{
              latitude: selectedJob.latitude ?? 4.711,
              longitude: selectedJob.longitude ?? -74.0721,
            }}
          />
        </MapView>
        <Text style={[s.modalTitle, { marginTop: 12 }]}>Postulantes</Text>
      </>
    );
  };

  /* --- render postulante --- */
  const renderApplicant = ({ item }: { item: Applicant }) => (
    <TouchableOpacity
      style={s.appItem}
      onPress={() => setSelectedApplicant(item)}
    >
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={s.appAvatar} />
      ) : (
        <Ionicons
          name="person-circle"
          size={48}
          color="#bbb"
          style={s.appAvatar}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.appName}>{item.name}</Text>
        <Text style={s.appEmail}>{item.email}</Text>
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
            ¡Aún no tienes trabajos publicados!
            {'\n'}
            Presiona “Publicar” para crear uno.
          </Text>
        </View>
      ) : (
        <FlatList data={jobs} keyExtractor={(j) => j.id} renderItem={renderJob} />
      )}

      {/* ---- Modal detalle job ---- */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        onRequestClose={closeJobModal}
      >
        <SafeAreaView style={s.modalContainer}>
          <TouchableOpacity style={s.backButton} onPress={closeJobModal}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* banner feedback */}
          {feedback.visible && (
            <Animated.View
              style={[s.feedbackInModal, { opacity: feedbackOpacity }]}
            >
              {Array.isArray(feedback.color) ? (
                <LinearGradient
                  colors={feedback.color as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: feedback.color as string, borderRadius: 20 },
                  ]}
                />
              )}
              <Text style={s.feedbackText}>{feedback.text}</Text>
            </Animated.View>
          )}

          <View style={s.modalContent}>
            {selectedJob &&
              (selectedApplicant ? (
                /* ---- detalle postulante ---- */
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  <View style={s.appDetailCard}>
                    {selectedApplicant.photoURL ? (
                      <Image
                        source={{ uri: selectedApplicant.photoURL }}
                        style={s.appPhoto}
                      />
                    ) : (
                      <Ionicons
                        name="person-circle"
                        size={180}
                        color="#bbb"
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
                      <TouchableOpacity
                        style={s.cvBox}
                        onPress={() =>
                          Linking.openURL(selectedApplicant.resumeURL!)
                        }
                      >
                        <Ionicons
                          name="document-attach-outline"
                          size={28}
                          color="#E23D3D"
                        />
                        <Text style={s.cvName}>Ver CV (PDF)</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={s.noCvText}>Sin hoja de vida</Text>
                    )}

                    <View style={s.divider} />

                    {schedulerActive ? (
                      <>
                        <TouchableOpacity
                          style={s.input}
                          onPress={() => setPicker({ visible: true, mode: 'date' })}
                        >
                          <Text style={{ color: scheduleModal.date ? '#000' : '#888' }}>
                            {scheduleModal.date || 'Elegir fecha'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.input}
                          onPress={() => setPicker({ visible: true, mode: 'time' })}
                        >
                          <Text style={{ color: scheduleModal.time ? '#000' : '#888' }}>
                            {scheduleModal.time || 'Elegir hora'}
                          </Text>
                        </TouchableOpacity>
                        <View style={s.detailButtons}>
                          <Button title="Cancelar" onPress={() => setSchedulerActive(false)} />
                          <Button title="Guardar" onPress={scheduleInterview} />
                        </View>
                      </>
                    ) : (
                      <View style={s.detailButtons}>
                        <Button
                          title="Rechazar"
                          color="#e53935"
                          onPress={() => changeStatus(selectedApplicant, 'rejected')}
                        />
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

                    <Button
                      title="Volver a lista"
                      onPress={() => setSelectedApplicant(null)}
                    />
                  </View>
                </ScrollView>
              ) : (
                /* ---- lista de postulantes + header ---- */
                <>
                  <JobDetailHeader />

                  {loadingApplicants ? (
                    <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                  ) : applicants.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                      <Text style={{ color: '#666' }}>Sin postulantes aún</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={applicants}
                      keyExtractor={(a) => a.appId}
                      renderItem={renderApplicant}
                      contentContainerStyle={{ paddingBottom: 24 }}
                    />
                  )}
                </>
              ))}
          </View>

          {/* DateTimePicker inline */}
          {picker.visible && (
            <View
              style={{
                backgroundColor: '#f7f7f7',       // lighter grey background
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ddd',              // subtle border
                padding: 8,
                alignSelf: 'center',
                ...Platform.select({
                  ios: { width: '80%' },
                  android: { width: '60%' },
                }),
              }}
            >
              <DateTimePicker
                value={new Date()}
                mode={picker.mode}
                display={
                  Platform.OS === 'ios'
                    ? picker.mode === 'date'
                      ? 'inline'
                      : 'spinner'
                    : 'default'
                }
                textColor={Platform.OS === 'ios' ? '#000000' : undefined}
                style={{
                  width: '100%',
                  height: Platform.OS === 'ios' ? 200 : undefined,
                  transform: Platform.OS === 'ios' ? [{ scale: 0.8 }] : undefined,
                }}
                onChange={(_, sel) => {
                  if (!sel) {
                    setPicker({ ...picker, visible: false });
                    return;
                  }
                  if (picker.mode === 'date') {
                    setScheduleModal((p) => ({ ...p, date: sel.toISOString().split('T')[0] }));
                    setPicker({ visible: false, mode: 'time' });
                  } else {
                    const hh = String(sel.getHours()).padStart(2, '0');
                    const mm = String(sel.getMinutes()).padStart(2, '0');
                    setScheduleModal((p) => ({ ...p, time: `${hh}:${mm}` }));
                    setPicker({ visible: false, mode: 'date' });
                  }
                }}
                themeVariant="light"              // ensure light theme on iOS
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ---- Modal edición trabajo ---- */}
      <Modal transparent animationType="fade" visible={!!editJob}>
        <View style={s.editOverlay}>
          <View style={s.editContainer}>
            <ScrollView>
              <Text style={s.modalTitle}>Editar Puesto</Text>
              <TextInput
                style={s.input}
                placeholder="Título"
                value={editFields.title}
                onChangeText={(t) => setEditFields((f) => ({ ...f, title: t }))}
              />
              <TextInput
                style={s.input}
                placeholder="Salario"
                value={editFields.pay}
                onChangeText={(t) => setEditFields((f) => ({ ...f, pay: t }))}
              />
              <TextInput
                style={s.input}
                placeholder="Duración"
                value={editFields.duration}
                onChangeText={(t) => setEditFields((f) => ({ ...f, duration: t }))}
              />
              <TextInput
                style={[s.input, { height: 80 }]}
                placeholder="Requisitos (separados por coma)"
                multiline
                value={editFields.requirementsText}
                onChangeText={(t) =>
                  setEditFields((f) => ({ ...f, requirementsText: t }))
                }
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

/* ─── helpers ───────────────────────────── */
const badgeStyle = (status: Applicant['status']) => [
  s.badge,
  status === 'pending' && s.badgePending,
  status === 'waiting' && s.badgeWaiting,
  status === 'accepted' && s.badgeAccepted,
  status === 'rejected' && s.badgeRejected,
];

/* ─── estilos ───────────────────────────── */
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: getStatusBarHeight(true),
    paddingHorizontal: 16,
  },
  noJobsContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noJobsText: { fontSize: 18, color: '#444', textAlign: 'center' },

  /* --- Tarjeta (igual a Matches) --- */
  cardWrapper: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  card: {
    width: '100%',
    height: 190,
    justifyContent: 'flex-end',
  },
  cardImage: { resizeMode: 'cover' },
  cardOverlay: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  desc: { color: '#eee', fontSize: 14, marginVertical: 4 },
  subtitle: { color: '#eee', fontSize: 14, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },

  /* --- Modal detalle --- */
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  backButton: { paddingHorizontal: 16, paddingVertical: 8 },
  modalContent: { flex: 1 },

  feedbackInModal: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    elevation: 8,
    zIndex: 10,
  },
  feedbackText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  modalTitle: { fontSize: 22, fontWeight: '700', alignSelf: 'center', marginVertical: 8 },
  detailImage: { width: '100%', height: 180 },
  detailDescription: { fontSize: 15, color: '#444', marginHorizontal: 16, marginTop: 4 },
  detailText: { fontSize: 14, color: '#555', marginHorizontal: 16 },
  detailList: { marginHorizontal: 16, marginTop: 4 },
  detailMap: { height: 160, margin: 16, borderRadius: 12, overflow: 'hidden' },

  /* --- lista de postulantes --- */
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  appAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  appName: { fontSize: 16, fontWeight: '600', color: '#333' },
  appEmail: { fontSize: 13, color: '#666' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: '700', color: '#fff', overflow: 'hidden' },
  badgePending: { backgroundColor: '#616161' },
  badgeWaiting: { backgroundColor: '#fb8c00' },
  badgeAccepted: { backgroundColor: '#43a047' },
  badgeRejected: { backgroundColor: '#e53935' },

  /* --- detalle postulante --- */
  appDetailCard: { alignItems: 'center' },
  appPhoto: { width: 180, height: 180, borderRadius: 90 },
  detailName: { fontSize: 22, fontWeight: '600', marginTop: 12 },
  divider: { width: '90%', height: 1, backgroundColor: '#ddd', marginVertical: 16 },
  cvBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, width: '90%', elevation: 2, marginTop: 12 },
  cvName: { marginLeft: 12, fontSize: 15, fontWeight: '500', color: '#333' },
  noCvText: { fontSize: 14, color: '#666', marginTop: 12 },

  /* --- inputs / botones --- */
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, width: '90%', alignSelf: 'center', marginBottom: 10 },
  detailButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', alignSelf: 'center', marginTop: 12 },

  /* --- edición trabajo --- */
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editContainer: { width: '90%', maxHeight: '80%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
});
