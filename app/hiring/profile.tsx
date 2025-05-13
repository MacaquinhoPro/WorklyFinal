import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../utils/firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 140;

export default function CompanyProfile() {
  const user = auth.currentUser;
  const fallbackName = user?.displayName || 'Empresa';
  const fallbackPhoto = user?.photoURL || 'https://via.placeholder.com/300';

  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState(fallbackName);
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState(fallbackPhoto);

  // ── cargar datos ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'users', user!.uid));
      if (snap.exists()) {
        const data = snap.data();
        setBio(data.bio || '');
        setCompanyName(data.companyName || fallbackName);
        if (data.photoURL) setPhotoURL(data.photoURL);
      }
    })();
  }, []);

  // ── cambiar foto ────────────────────────────────────────────
  const changePhoto = async () => {
    try {
      const { status: libStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: camStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      if (libStatus !== 'granted' || camStatus !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requieren permisos de cámara y galería.');
        return;
      }

      Alert.alert('Seleccionar imagen', '¿De dónde deseas obtener la foto?', [
        {
          text: 'Cámara',
          onPress: () => pick('camera'),
        },
        {
          text: 'Galería',
          onPress: () => pick('gallery'),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const pick = async (source: 'camera' | 'gallery') => {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
          });

    if (!result.canceled && result.assets?.length) {
      try {
        const uri = result.assets[0].uri;
        const fileRef = ref(storage, `avatars/${user!.uid}_${Date.now()}.jpg`);
        const resp = await fetch(uri);
        const blob = await resp.blob();
        await uploadBytes(fileRef, blob);
        const downloadURL = await getDownloadURL(fileRef);

        await updateProfile(user!, { photoURL: downloadURL });
        await updateDoc(doc(db, 'users', user!.uid), { photoURL: downloadURL });
        setPhotoURL(downloadURL);
      } catch (e: any) {
        Alert.alert('Error', 'No se pudo actualizar la imagen.');
      }
    }
  };

  // ── guardar bio / nombre ───────────────────────────────────
  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        companyName,
        bio,
      });
      Alert.alert('Guardado', 'Perfil actualizado');
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── modal edición ─────────────── */}
      <Modal transparent visible={editing} animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Editar perfil</Text>
            <Text style={s.modalLabel}>Nombre de empresa</Text>
            <TextInput
              style={s.modalInput}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Nombre de empresa"
            />
            <Text style={s.modalLabel}>Descripción</Text>
            <TextInput
              style={[s.modalInput, { height: 100 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Descripción"
              multiline
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setEditing(false)} style={s.cancelButton}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveButton} onPress={handleSave}>
                <LinearGradient
                  colors={['#5A40EA', '#EE805F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.saveGradient}
                >
                  <Text style={s.saveText}>Guardar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={s.brandRow}>
          <Feather name="briefcase" size={24} color="#000" />
          <Text style={s.brandText}>Workly</Text>
        </View>

        {/* avatar */}
        <LinearGradient
          colors={['#5A40EA', '#EE805F']}
          style={s.avatarWrapper}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity style={s.avatarInner} onPress={changePhoto}>
            <Image source={{ uri: photoURL }} style={s.avatar} />
          </TouchableOpacity>
        </LinearGradient>

        {/* nombre y descripción */}
        <Text style={s.name}>{companyName}</Text>
        <Text style={s.description}>{bio}</Text>

        {/* editar */}
        <View style={[s.actionsRow, { justifyContent: 'center' }]}>
          <View style={s.actionItemCenter}>
            <TouchableOpacity style={s.editButton} onPress={() => setEditing(true)}>
              <MaterialCommunityIcons name="pencil-outline" size={32} color="#000" />
              <View style={s.dotRed} />
            </TouchableOpacity>
            <Text style={s.actionLabel}>EDITAR PERFIL</Text>
          </View>
        </View>

        {/* tarjeta premium opcional */}
        <View style={s.platinumCard}>
          <LinearGradient colors={['#FFF', '#F7F7F7']} style={s.platinumBg} />
          <Feather name="briefcase" size={24} color="#000" />
          <Text style={s.platinumTitle}>Workly Platinum</Text>
          <Text style={s.platinumSubtitle}>Level up every action you take on Workly</Text>
          <View style={s.pagination}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[s.dot, i === 1 && s.dotActive]} />
            ))}
          </View>
          <TouchableOpacity style={s.learnMoreBtn}>
            <Text style={s.learnMoreText}>LEARN MORE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  container: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandText: { fontSize: 24, fontWeight: '600', marginLeft: 8 },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 4,
    borderRadius: (AVATAR_SIZE + 16) / 2 + 4,
  },
  avatarInner: {
    width: AVATAR_SIZE + 16,
    height: AVATAR_SIZE + 16,
    borderRadius: (AVATAR_SIZE + 16) / 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  name: { fontSize: 22, fontWeight: '600', marginBottom: 24, color: '#333' },
  description: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  actionsRow: { flexDirection: 'row', width: '100%', marginBottom: 30 },
  actionItemCenter: { alignItems: 'center', flex: 1 },
  actionLabel: { fontSize: 12, color: '#666', marginTop: 6 },
  editButton: {
    backgroundColor: '#FFF',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    position: 'absolute',
    top: 6,
    right: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalLabel: { fontSize: 14, color: '#666', marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 8, marginTop: 4 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  saveGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontSize: 14 },
  /* premium card */
  platinumCard: {
    width: width - 40,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 20,
  },
  platinumBg: { ...StyleSheet.absoluteFillObject, borderRadius: 16 },
  platinumTitle: { fontSize: 20, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  platinumSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 },
  pagination: { flexDirection: 'row', marginBottom: 16 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DDD',
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: '#5A40EA' },
  learnMoreBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  learnMoreText: { fontSize: 14, fontWeight: '600', color: '#333' },
});
