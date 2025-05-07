import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Button, ActivityIndicator } from 'react-native';
import { db, auth } from '../utils/firebaseconfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { router } from 'expo-router';

type Job = {
  id: string;
  title: string;
  pay: string;
  duration: string;
  applicantsCount?: number;
};

type Applicant = { userId: string; status: string };

export default function MyJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Escucha mis puestos
  useEffect(() => {
    const q = query(collection(db, 'jobs'), where('ownerUid', '==', auth.currentUser!.uid));
    const unsub = onSnapshot(q, (snap) => {
      const arr: Job[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setJobs(arr);
    });
    return () => unsub();
  }, []);

  // cargar postulantes
  const openJob = async (job: Job) => {
    setSelectedJob(job);
    setLoadingApplicants(true);
    const qs = await getDocs(
      query(collection(db, 'applications'), where('jobId', '==', job.id))
    );
    const array: Applicant[] = qs.docs.map((d) => {
      const data = d.data();
      return { userId: data.userId, status: data.status };
    });
    setApplicants(array);
    setLoadingApplicants(false);
  };

  const deleteJob = async (jobId: string) => {
    await deleteDoc(doc(db, 'jobs', jobId));
  };

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity style={s.card} onPress={() => openJob(item)}>
      <Text style={s.title}>{item.title}</Text>
      <Text>{item.duration}</Text>
      <Text>{item.pay}</Text>
      <View style={s.row}>
        <Button title="Editar" onPress={() => router.push({ pathname: '/hiring/publish', params: { jobId: item.id } })} />
        <Button title="Eliminar" color="red" onPress={() => deleteJob(item.id)} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList data={jobs} keyExtractor={(j) => j.id} renderItem={renderJob} />
      {/* Modal postulantes */}
      <Modal visible={selectedJob !== null} animationType="slide">
        <View style={{ flex: 1, padding: 20 }}>
          <Button title="Cerrar" onPress={() => setSelectedJob(null)} />
          {selectedJob && (
            <>
              <Text style={s.modalTitle}>{selectedJob.title}</Text>
              {loadingApplicants ? (
                <ActivityIndicator size="large" />
              ) : applicants.length === 0 ? (
                <Text>No hay postulantes</Text>
              ) : (
                applicants.map((a, i) => (
                  <View key={i} style={s.applicant}>
                    <Text>{a.userId}</Text>
                    <Text>{a.status}</Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

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
  applicant: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
