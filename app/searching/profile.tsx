import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, Image, TouchableOpacity,
  StyleSheet, Dimensions, Platform, TextInput, Modal, Alert,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../utils/firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 140;

export default function ProfileScreen() {
  const user = auth.currentUser!;
  const [editing, setEditing] = useState(false);
  const [displayNameState, setDisplayNameState] = useState(user.displayName || 'User');
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState(
    user.photoURL || 'https://via.placeholder.com/300'
  );

  /* ── cargar Firestore ── */
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setDescription(d.description || '');
        setDisplayNameState(d.displayName || user.displayName || 'User');
        if (d.photoURL) setPhotoURL(d.photoURL);
      }
    })();
  }, []);

  /* ── cambiar foto ── */
  const changePhoto = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (lib.status !== 'granted' || cam.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se requieren permisos.');
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
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.8,
          });
    if (res.canceled || !res.assets?.length) return;

    try {
      const uri = res.assets[0].uri;
      const blob = await (await fetch(uri)).blob();
      const fileRef = ref(storage, `avatars/${user.uid}_${Date.now()}.jpg`);
      const task = uploadBytesResumable(fileRef, blob, {
        contentType: 'image/jpeg',
      });
      task.on('state_changed', (snap) => {
        console.log(
          `Upload ${(snap.bytesTransferred / snap.totalBytes) * 100}%`
        );
      });
      await task;
      const downloadURL = await getDownloadURL(fileRef);

      await updateProfile(user, { photoURL: downloadURL });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
      setPhotoURL(downloadURL);
    } catch (e: any) {
      console.error('UPLOAD ERROR →', JSON.stringify(e, null, 2));
      Alert.alert('Error', e.code ?? e.message ?? 'Subida falló');
    }
  };

  /* ── guardar texto ── */
  const handleSave = async () => {
    await updateDoc(doc(db, 'users', user.uid), {
      displayName: displayNameState,
      description,
    });
    setEditing(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* modal edición */}
      <Modal transparent visible={editing} animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Editar perfil</Text>
            <Text style={s.modalLabel}>Nombre</Text>
            <TextInput
              style={s.modalInput}
              value={displayNameState}
              onChangeText={setDisplayNameState}
            />
            <Text style={s.modalLabel}>Descripción</Text>
            <TextInput
              style={[s.modalInput, { height: 100 }]}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setEditing(false)} style={s.cancelButton}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={s.saveButton}>
                <Text style={s.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.container}>
        <View style={s.brandRow}>
          <Feather name="briefcase" size={24} color="#000" />
          <Text style={s.brandText}>Workly</Text>
        </View>

        <TouchableOpacity style={s.avatarWrapper} onPress={changePhoto}>
          <Image source={{ uri: photoURL }} style={s.avatar} />
        </TouchableOpacity>

        <Text style={s.name}>{displayNameState}</Text>
        <Text style={s.description}>{description}</Text>

        <View style={[s.actionsRow, { justifyContent: 'center' }]}>
          <View style={s.actionItemCenter}>
            <TouchableOpacity style={s.editButton} onPress={() => setEditing(true)}>
              <MaterialCommunityIcons name="pencil-outline" size={32} color="#000" />
              <View style={s.dotRed} />
            </TouchableOpacity>
            <Text style={s.actionLabel}>EDITAR PERFIL</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* —— estilos sin cambios ——— */
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
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    width: AVATAR_SIZE + 16, height: AVATAR_SIZE + 16,
    borderRadius: (AVATAR_SIZE + 16) / 2, borderWidth: 4, borderColor: '#5A40EA',
  },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  name: { fontSize: 22, fontWeight: '600', marginBottom: 24, color: '#333' },
  description: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  actionsRow: { flexDirection: 'row', width: '100%', marginBottom: 30 },
  actionItemCenter: { alignItems: 'center', flex: 1 },
  actionLabel: { fontSize: 12, color: '#666', marginTop: 6 },
  editButton: {
    backgroundColor: '#FFF', width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  dotRed: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30',
    position: 'absolute', top: 6, right: 6,
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalLabel: { fontSize: 14, color: '#666', marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 8, marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 8 },
  cancelText: { color: '#666', fontSize: 14 },
  saveButton: {
    backgroundColor: '#5A40EA', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 6, marginLeft: 8,
  },
  saveText: { color: '#FFF', fontSize: 14 },
});
