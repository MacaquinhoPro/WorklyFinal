import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStatusBarHeight } from 'react-native-iphone-x-helper';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  doc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db, auth, storage } from '../utils/firebaseconfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

interface Form {
  title: string;
  description: string;
  pay: string;
  duration: string;
  requirements: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: getStatusBarHeight(true),
    backgroundColor: '#ffffff',
  },
  content: {
    paddingVertical: 16,
  },
  input: {
    width: '100%',
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginVertical: 16,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Android elevation
    elevation: 3,
  },
  inputMultiline: {
    height: 200,
    textAlignVertical: 'top',
  },
  button: {
    alignSelf: 'center',
    width: '80%',
    marginVertical: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  err: { color: 'red', marginBottom: 8 },
  imgBtn: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    // Android elevation
    elevation: 3,
  },
  imgPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  imgText: { color: '#555' },
  removeBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    // Android elevation
    elevation: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  stepDotActive: {
    backgroundColor: '#5A40EA',
  },
  stepDotInactive: {
    backgroundColor: '#ccc',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  navButtonsCenter: {
    justifyContent: 'center',
  },
  navText: {
    fontSize: 16,
    color: '#5A40EA',
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  navTextDisabled: {
    color: '#ccc',
  },
});

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  pay: z.string().min(1, 'Pay is required'),
  duration: z.string().min(1, 'Duration is required'),
  requirements: z.string().min(1, 'Requirements are required'),
});

export default function Publish() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const isEdit = Boolean(jobId);

  const [step, setStep] = useState(0);
  const totalSteps = 5;

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      pay: '',
      duration: '',
      requirements: '',
    },
  });
  
  const title = watch('title');
  const description = watch('description');
  const pay = watch('pay');
  const duration = watch('duration');
  const requirements = watch('requirements');
  
  /* ---------- imagen ---------- */
  const [imageUri, setImageUri] = React.useState<string>('');
  
  const [region, setRegion] = useState({
    latitude: 4.7110,
    longitude: -74.0721,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
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
      Alert.alert('Permiso denegado', 'No se concedió acceso a la galería.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      setImageUri(res.assets[0].uri);
    }
  };

  /* ---------- cargar datos para edición ---------- */
  React.useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const snap = await getDoc(doc(db, 'jobs', jobId!));
      if (snap.exists()) {
        const d: any = snap.data();
        reset({
          title: d.title,
          description: d.description,
          pay: d.pay,
          duration: d.duration,
          requirements: d.requirements.join(', '),
        });
        setImageUri(d.imageUrl || '');
        if (d.latitude && d.longitude) {
          setMarker({ latitude: d.latitude, longitude: d.longitude });
          setRegion({
            latitude: d.latitude,
            longitude: d.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
    })();
  }, []);

  /* ---------- enviar ---------- */
  const onSubmit = async (data: Form) => {
    try {
      // 1. subir imagen si es local
      let photoURL = imageUri;
      if (imageUri && !imageUri.startsWith('http')) {
        const fileRef = ref(
          storage,
          `jobImages/${auth.currentUser!.uid}_${Date.now()}.jpg`
        );
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        await uploadBytes(fileRef, blob);
        photoURL = await getDownloadURL(fileRef);
      }

      // 2. payload
      const payload = {
        ownerUid: auth.currentUser!.uid,
        title: data.title,
        description: data.description,
        pay: data.pay,
        duration: data.duration,
        requirements: data.requirements.split(',').map((t) => t.trim()),
        imageUrl: photoURL, // <- clave utilizada por searching/feed
        latitude: marker!.latitude,
        longitude: marker!.longitude,
        createdAt: serverTimestamp(),
      };

      // 3. crear / actualizar
      if (isEdit) await updateDoc(doc(db, 'jobs', jobId!), payload);
      else await addDoc(collection(db, 'jobs'), payload);

      Alert.alert('Éxito', isEdit ? 'Puesto actualizado' : 'Puesto publicado');
      router.replace('/hiring/myJobs');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  /* ---------- campo reutilizable ---------- */
  const Field = ({
    name,
    placeholder,
    multiline = false,
  }: {
    name: keyof Form;
    placeholder: string;
    multiline?: boolean;
  }) => (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            placeholder={placeholder}
            placeholderTextColor="#999"
            multiline={multiline}
            keyboardType="default"
            blurOnSubmit={false}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.err}>{errors[name]?.message as string}</Text>
      )}
    </>
  );

  /* ---------- UI ---------- */
  return (
    <SafeAreaView style={styles.container}>
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {[...Array(totalSteps)].map((_, i) => (
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
          // Step 1: Image picker
          <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.imgPreview} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setImageUri('')}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.imgText}>Publica foto</Text>
            )}
          </TouchableOpacity>
        )}
        {step === 1 && (
          // Step 2: Title & Description
          <>
            <Field name="title" placeholder="Título del puesto" />
            <Field name="description" placeholder="Descripción" multiline />
          </>
        )}
        {step === 2 && (
          // Step 3: Pay & Duration
          <>
            <Field name="pay" placeholder="Pago / salario" />
            <Field
              name="duration"
              placeholder="Duración (p.ej. tiempo completo)"
            />
          </>
        )}
        {step === 3 && (
          // Step 4: Requirements & Submit
          <>
            <Field
              name="requirements"
              placeholder="Requisitos (separados por coma)"
            />
          </>
        )}
        {step === 4 && (
          // Step 5: Location picker
          <>
            <MapView
              style={{ width: '100%', flex: 1, borderRadius: 16 }}
              initialRegion={region}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setMarker({ latitude, longitude });
              }}
              onRegionChangeComplete={(r) => setRegion(r)}
            >
              {marker && <Marker coordinate={marker} />}
            </MapView>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit(onSubmit)}
              disabled={!marker || isSubmitting}
            >
              <LinearGradient
                colors={['#5A40EA', '#EE805F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {isEdit ? 'Guardar cambios' : 'Publicar'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
      <View style={[styles.navButtons, step === 0 && styles.navButtonsCenter]}>
        {step > 0 && (
          <TouchableOpacity onPress={() => setStep(step - 1)}>
            <Text style={styles.navText}>Anterior</Text>
          </TouchableOpacity>
        )}
        {step < totalSteps - 1 && (
          <TouchableOpacity
            onPress={() => canGoNext && setStep(step + 1)}
            disabled={!canGoNext}
          >
            <Text style={[
              styles.navText,
              !canGoNext && styles.navTextDisabled
            ]}>
              Siguiente
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
