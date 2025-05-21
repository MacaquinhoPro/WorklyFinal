import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, storage } from './utils/firebaseconfig';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type Role = 'searching' | 'hiring';

const DEFAULT_AVATAR =
  'https://firebasestorage.googleapis.com/v0/b/workly-9872e.firebasestorage.app/o/avatars%2Funknown.jpg?alt=media&token=88357e30-4930-41bf-bdeb-5e280ace6883';

export default function RegisterScreen() {
  const router = useRouter();
  const totalSteps = 6;
  const titles = [
    'My email is',
    'My password is',
    'My first name is',
    'Education',
    'Add a profile photo',
    'You are',
  ];

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [education, setEducation] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [photoUri, setPhotoUri] = useState<string>('');
  const [error, setError] = useState('');

  /* ---------- errores legibles ---------- */
  const getFriendlyError = (error: any): string => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este correo electrónico ya está registrado.';
      case 'auth/invalid-email':
        return 'El correo electrónico no es válido.';
      case 'auth/weak-password':
        return 'La contraseña es demasiado débil.';
      default:
        return 'Error en el registro. Por favor, inténtalo de nuevo.';
    }
  };

  /* ---------- paso siguiente ---------- */
  const handleNext = async () => {
    setError('');
    if (step === 0) {
      if (!email.trim()) return setError('Ingresa tu correo.');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim()))
        return setError('El correo electrónico no es válido.');
      setStep(step + 1);
    } else if (step === 1) {
      if (!password) return setError('Ingresa tu contraseña.');
      if (password.length < 6)
        return setError('La contraseña debe tener al menos 6 caracteres.');
      setStep(step + 1);
    } else if (step === 2) {
      if (!firstName.trim()) return setError('Ingresa tu nombre.');
      setStep(step + 1);
    } else if (step === 3) {
      if (!education.trim()) return setError('Ingresa tu formación.');
      setStep(step + 1);
    } else if (step === 4) {
      // no hay validación obligatoria de foto
      setStep(step + 1);
    } else if (step === 5) {
      if (!selectedRole) return setError('Selecciona un rol.');
      try {
        /* ---- crear usuario ---- */
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
        let avatarURL = DEFAULT_AVATAR;

        /* ---- subir foto si eligió ---- */
        if (photoUri) {
          const fileRef = ref(
            storage,
            `avatars/${cred.user.uid}_${Date.now()}.jpg`
          );
          const resp = await fetch(photoUri);
          const blob = await resp.blob();
          await uploadBytes(fileRef, blob);
          avatarURL = await getDownloadURL(fileRef);
        }

        /* ---- actualizar perfil auth ---- */
        await updateProfile(cred.user, {
          displayName: firstName.trim(),
          photoURL: avatarURL,
        });

        /* ---- guardar en Firestore ---- */
        const db = getFirestore(auth.app);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: firstName.trim(),
          email: email.trim(),
          education: education.trim(),
          role: selectedRole,
          photoURL: avatarURL,
          createdAt: Date.now(),
        });

        router.replace('/login');
      } catch (err: any) {
        setError(getFriendlyError(err));
      }
    }
  };

  /* ---------- seleccionar foto ---------- */
  const pickPhoto = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (lib.status !== 'granted' || cam.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requieren permisos para cámara y galería.');
      return;
    }
    Alert.alert('Seleccionar imagen', '¿De dónde obtener la foto?', [
      { text: 'Cámara', onPress: () => pick('camera') },
      { text: 'Galería', onPress: () => pick('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const pick = async (source: 'camera' | 'gallery') => {
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.8,
          });
    if (!res.canceled && res.assets?.length) setPhotoUri(res.assets[0].uri);
  };

  const handleProgressPress = (index: number) => {
    setError('');
    setStep(index);
  };

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      {/* ---------- header ---------- */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={styles.backIcon}
        >
          <Ionicons name="arrow-back" size={24} color="#5A40EA" />
        </TouchableOpacity>
        <Text style={styles.titleTop}>{titles[step]}</Text>
      </View>

      {/* ---------- body ---------- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.inner, step === 5 && { justifyContent: 'center' }]}
      >
        {/* barra progreso */}
        <View style={styles.progressBar}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={{ flex: 1 }}
              onPress={() => handleProgressPress(i)}
            >
              <View
                style={[
                  styles.barSegment,
                  i <= step ? styles.barActive : styles.barInactive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* error */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* pasos */}
        {step === 0 && (
          <TextInput
            style={styles.input}
            placeholder="example@gmail.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}

        {step === 1 && (
          <TextInput
            style={styles.input}
            placeholder="••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        )}

        {step === 2 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor="#888"
              value={firstName}
              onChangeText={setFirstName}
            />
            <Text style={styles.helper}>
              This is how it will appear in Workly and you will not be able to
              change it
            </Text>
          </>
        )}

        {step === 3 && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Institution & degree"
              placeholderTextColor="#888"
              value={education}
              onChangeText={setEducation}
            />
            <Text style={styles.helper}>
              From which institution did you graduate, and what degree did you
              earn?
            </Text>
          </>
        )}

        {step === 4 && (
          <View style={styles.photoContainer}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <Ionicons name="camera" size={40} color="#666" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPhotoUri('')}>
              <Text style={styles.skipText}>Omitir</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && (
          <View style={styles.rolesContainer}>
            <View style={styles.roles}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 'searching' && styles.roleSelected,
                ]}
                onPress={() => setSelectedRole('searching')}
              >
                <Text style={styles.roleText}>SEARCHING</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  selectedRole === 'hiring' && styles.roleSelected,
                ]}
                onPress={() => setSelectedRole('hiring')}
              >
                <Text style={styles.roleText}>HIRING</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* nav buttons */}
        <View style={styles.navButtons}>
          {step > 0 && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              style={styles.navButton}
            >
              <Text style={styles.navButtonText}>BACK</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            style={[styles.navButton, { flex: 1 }]}
          >
            <LinearGradient
              colors={['#5A40EA', '#EE805F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.navButtonText}>
              {step === 5 ? 'FINISH' : 'CONTINUE'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'flex-end' },
  progressBar: { flexDirection: 'row', marginBottom: 0 },
  barSegment: { flex: 1, height: 4, marginHorizontal: 2, borderRadius: 2 },
  barActive: { backgroundColor: '#5A40EA' },
  barInactive: { backgroundColor: '#DDD' },
  error: { color: '#ff4d4d', marginBottom: 12, textAlign: 'center' },

  input: {
    borderBottomWidth: 1,
    borderColor: '#888',
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  helper: { fontSize: 12, color: '#888', marginBottom: 20 },

  /* foto */
  photoContainer: { alignItems: 'center', marginBottom: 300 },
  photoBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#5A40EA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  skipText: {
    marginTop: 12,
    color: '#666',
    textDecorationLine: 'underline',
    fontSize: 14,
  },

  /* roles */
  rolesContainer: { flex: 1, justifyContent: 'center' },
  roles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  roleSelected: { borderColor: '#5A40EA' },
  roleText: { fontSize: 16, color: '#444' },

  /* navegación */
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  navButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  backIcon: { marginRight: 12 },
  titleTop: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
});
