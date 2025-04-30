// app/register.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from './utils/firebaseconfig';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Role = 'searching' | 'hiring';

export default function RegisterScreen() {
  const router = useRouter();
  const totalSteps = 5;
  const titles = [
    'My email is',
    'My password is',
    'My first name is',
    'Education',
    'You are',
  ];

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [education, setEducation] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [error, setError] = useState('');

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

  const handleNext = async () => {
    setError('');
    if (step === 0) {
      if (!email.trim()) {
        setError('Ingresa tu correo.');
        return;
      }
      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('El correo electrónico no es válido.');
        return;
      }
      setStep(step + 1);
    } else if (step === 1) {
      if (!password) {
        setError('Ingresa tu contraseña.');
        return;
      }
      // Validar longitud mínima de la contraseña
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      setStep(step + 1);
    } else if (step === 2) {
      if (!firstName.trim()) {
        setError('Ingresa tu nombre.');
        return;
      }
      setStep(step + 1);
    } else if (step === 3) {
      if (!education.trim()) {
        setError('Ingresa tu formación.');
        return;
      }
      setStep(step + 1);
    } else if (step === 4) {
      if (!selectedRole) {
        setError('Selecciona un rol.');
        return;
      }
      // final register
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: firstName.trim() });
        const db = getFirestore(auth.app);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: firstName.trim(),
          email: email.trim(),
          education: education.trim(),
          role: selectedRole,
          createdAt: Date.now(),
        });
        router.replace('/login');
      } catch (err: any) {
        setError(getFriendlyError(err));
      }
    }
  };

  const handleProgressPress = (index: number) => {
    // Clear any existing error and move to tapped step
    setError('');
    setStep(index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => {
            if (step > 0) {
              setStep(step - 1);
            } else {
              router.back();
            }
          }}
          style={styles.backIcon}
        >
          <Ionicons name="arrow-back" size={24} color="#5A40EA" />
        </TouchableOpacity>
        <Text style={styles.titleTop}>{titles[step]}</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.inner,
          step === 4 && { justifyContent: 'center' }
        ]}
      >
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
            <Text style={styles.navButtonText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-end',
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  barSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  barActive: {
    backgroundColor: '#5A40EA',
  },
  barInactive: {
    backgroundColor: '#DDD',
  },
  error: {
    color: '#ff4d4d',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#888',
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  helper: {
    fontSize: 12,
    color: '#888',
    marginBottom: 20,
  },
  rolesContainer: {
    flex: 1,
    justifyContent: 'center',
  },
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
  roleSelected: {
    borderColor: '#5A40EA',
  },
  roleText: {
    fontSize: 16,
    color: '#444',
  },
  continueBtn: {
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  backIcon: {
    marginRight: 12,
  },
  titleTop: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
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
  navButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
