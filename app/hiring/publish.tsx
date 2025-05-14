import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, storage } from '../utils/firebaseconfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface FormData {
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string;
}

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().min(1, 'Required'),
  pay: z.string().min(1, 'Required'),
  duration: z.string().min(1, 'Required'),
  requirements: z.string().min(1, 'Required'),
});

export default function Publish() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const isEdit = Boolean(jobId);

  const totalSteps = 5;
  const [step, setStep] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      pay: '',
      duration: '',
      requirements: '',
    },
    shouldUnregister: false,
  });

  const title = watch('title');
  const description = watch('description');
  const pay = watch('pay');
  const duration = watch('duration');
  const requirements = watch('requirements');

  const initialRegion: Region = {
    latitude: 4.711,
    longitude: -74.0721,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const [imageUri, setImageUri] = useState<string>('');
  const [region, setRegion] = useState<Region>(initialRegion);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  const canGoNext = (() => {
    if (step === 0) return !!imageUri;
    if (step === 1) return !!title && !!description && !errors.title && !errors.description;
    if (step === 2) return !!pay && !!duration && !errors.pay && !errors.duration;
    if (step === 3) return !!requirements && !errors.requirements;
    if (step === 4) return marker !== null;
    return false;
  })();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length) {
      setImageUri(res.assets[0].uri);
    }
  };

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const snap = await getDoc(doc(db, 'jobs', jobId!));
      if (snap.exists()) {
        const data = snap.data() as any;
        reset({
          title: data.title,
          description: data.description,
          pay: data.pay,
          duration: data.duration,
          requirements: data.requirements.join(', '),
        });
        setImageUri(data.imageUrl || '');
        if (data.latitude && data.longitude) {
          setMarker({ latitude: data.latitude, longitude: data.longitude });
          setRegion({
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
    })();
  }, [isEdit, jobId]);

  const onSubmit = useCallback(
    async (form: FormData) => {
      try {
        let photoURL = imageUri;
        if (imageUri && !imageUri.startsWith('http')) {
          const fileRef = ref(
            storage,
            `jobImages/${auth.currentUser!.uid}_${Date.now()}.jpg`
          );
          const blob = await (await fetch(imageUri)).blob();
          await uploadBytes(fileRef, blob);
          photoURL = await getDownloadURL(fileRef);
        }

        const payload = {
          ownerUid: auth.currentUser!.uid,
          title: form.title,
          description: form.description,
          pay: form.pay,
          duration: form.duration,
          requirements: form.requirements.split(',').map((t) => t.trim()),
          imageUrl: photoURL,
          latitude: marker!.latitude,
          longitude: marker!.longitude,
          createdAt: serverTimestamp(),
        };

        if (isEdit) {
          await updateDoc(doc(db, 'jobs', jobId!), payload);
          Alert.alert('¡Éxito!', 'Publicado actualizado');
          router.replace('/hiring/myJobs');
        } else {
          const newRef = doc(collection(db, 'jobs'));
          await setDoc(newRef, { ...payload, id: newRef.id });
          Alert.alert('¡Éxito!', 'Publicado creado');

          // Resetear todo para crear desde cero de nuevo
          reset({
            title: '',
            description: '',
            pay: '',
            duration: '',
            requirements: '',
          });
          setImageUri('');
          setRegion(initialRegion);
          setMarker(null);
          setStep(0);
        }
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    },
    [imageUri, marker, isEdit, jobId]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={getStatusBarHeight() + 10}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepIndicator}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  i === step ? styles.stepDotActive : styles.stepDotInactive,
                ]}
              />
            ))}
          </View>

          <View style={styles.stepContainer}>
            {step === 0 && (
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                {imageUri ? (
                  <>
                    <Image source={{ uri: imageUri }} style={styles.imgPreview} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => setImageUri('')}
                    >
                      <Ionicons name="close-circle" size={24} color="#d32f2f" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.imgText}>Toca para seleccionar foto</Text>
                )}
              </TouchableOpacity>
            )}
            {step === 1 && (
              <>
                <Controller
                  control={control}
                  name="title"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Título"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Descripción"
                      multiline
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {errors.description && <Text style={styles.error}>{errors.description.message}</Text>}
              </>
            )}
            {step === 2 && (
              <>
                <Controller
                  control={control}
                  name="pay"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Salario"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {errors.pay && <Text style={styles.error}>{errors.pay.message}</Text>}
                <Controller
                  control={control}
                  name="duration"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Duración"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {errors.duration && <Text style={styles.error}>{errors.duration.message}</Text>}
              </>
            )}
            {step === 3 && (
              <>
                <Controller
                  control={control}
                  name="requirements"
                  render={({ field: { value, onChange } }) => (
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Requisitos (separados por coma)"
                      multiline
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {errors.requirements && <Text style={styles.error}>{errors.requirements.message}</Text>}
              </>
            )}
            {step === 4 && (
              <>
                <Text style={{ marginBottom: 8, textAlign: 'center' }}>
                  Toca el mapa para ubicar la oferta
                </Text>
                <MapView
                  style={styles.map}
                  region={region}
                  onRegionChangeComplete={setRegion}
                  onPress={(e) => setMarker(e.nativeEvent.coordinate)}
                >
                  {marker && (
                    <Marker
                      coordinate={marker}
                      draggable
                      onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)}
                    />
                  )}
                </MapView>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)}>
              <Text style={styles.navText}>Back</Text>
            </TouchableOpacity>
          )}
          {step < totalSteps - 1 ? (
            <TouchableOpacity
              onPress={() => canGoNext && setStep(step + 1)}
              disabled={!canGoNext}
            >
              <Text style={[styles.navText, !canGoNext && styles.navDisabled]}>
                Next
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={!canGoNext || isSubmitting}
              style={styles.submitBtn}
            >
              <LinearGradient
                colors={['#5A40EA', '#8A65F3']}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isEdit ? 'Actualizar' : 'Publicar'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex1: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  stepDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 6 },
  stepDotActive: { backgroundColor: '#5A40EA' },
  stepDotInactive: { backgroundColor: '#ccc' },
  stepContainer: { flex: 1 },
  input: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#d32f2f', marginLeft: 4 },
  imgBtn: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#eee',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  imgPreview: { width: '100%', height: '100%', borderRadius: 12 },
  imgText: { color: '#555' },
  removeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#fff',
    padding: 4,
    borderRadius: 12,
  },
  map: { width: '100%', height: 200, borderRadius: 12, marginVertical: 8 },
  submitBtn: { flex: 1, alignItems: 'flex-end' },
  submitGradient: { padding: 12, borderRadius: 12 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  navText: { fontSize: 16, color: '#5A40EA' },
  navDisabled: { color: '#bbb' },
});
