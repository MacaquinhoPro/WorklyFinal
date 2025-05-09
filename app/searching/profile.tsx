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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../utils/firebaseconfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebaseconfig';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 140;

export default function ProfileScreen() {
  const user = auth.currentUser;
  const completion = 0.26; // 26%
  const name = user?.displayName || 'Rachel';
  const photoURL = user?.photoURL || 'https://via.placeholder.com/300';

  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState('');
  const [displayNameState, setDisplayNameState] = useState(name);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'users', user!.uid));
      if (snap.exists()) {
        const data = snap.data();
        setDescription(data.description || '');
        setDisplayNameState(data.displayName || name);
      }
    })();
  }, []);

  const handleSave = async () => {
    await updateDoc(doc(db, 'users', user!.uid), {
      description,
      displayName: displayNameState,
    });
    setEditing(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      <Modal transparent visible={editing} animationType="slide">
        <View style={s.overlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Edita tu perfil</Text>
            <Text style={s.modalLabel}>Nombre</Text>
            <TextInput
              style={s.modalInput}
              value={displayNameState}
              onChangeText={setDisplayNameState}
              placeholder="Ingresa tu nombre"
            />
            <Text style={s.modalLabel}>Descripción</Text>
            <TextInput
              style={[s.modalInput, { height: 100 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Escribe algo sobre ti"
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
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.brandRow}>
          <MaterialCommunityIcons name="briefcase-outline" size={24} color="#000" />
          <Text style={s.brandText}>Workly</Text>
        </View>

        {/* Avatar + Progress */}
        <View style={s.avatarWrapper}>
          <Image source={{ uri: photoURL }} style={s.avatar} />
        </View>

        {/* Name & Age */}
        <Text style={s.name}>{displayNameState}</Text>
        <Text style={s.description}>{description}</Text>

        {/* Actions */}
        <View style={[s.actionsRow, { justifyContent: 'center' }]}>  
          <View style={s.actionItemCenter}>
            <TouchableOpacity style={s.editButton}
              onPress={() => setEditing(true)}
            >
              <MaterialCommunityIcons name="pencil-outline" size={32} color="#000" />
              <View style={s.dotRed} />
            </TouchableOpacity>
            <Text style={s.actionLabel}>EDIT PROFILE</Text>
          </View>
        </View>

        {/* Platinum Card */}
        <View style={s.platinumCard}>
          <LinearGradient
            colors={["#FFF","#F7F7F7"]}
            style={s.platinumBg}
          />
          <MaterialCommunityIcons name="briefcase-outline" size={24} color="#000" />
          <Text style={s.platinumTitle}>Workly Platinum</Text>
          <Text style={s.platinumSubtitle}>Level up every action you take on Workly</Text>
          <View style={s.pagination}>
            {[1,2,3,4,5].map(i => (
              <View key={i} style={[s.dot, i===1 && s.dotActive]} />
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
  titleSmall: {
    alignSelf: 'flex-start',
    fontSize: 14,
    color: '#AAA',
    marginBottom: 6,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandText: { fontSize: 24, fontWeight: '600', marginLeft: 8 },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: AVATAR_SIZE + 16,
    height: AVATAR_SIZE + 16,
    borderRadius: (AVATAR_SIZE + 16) / 2,
    borderWidth: 4,
    borderColor: '#5A40EA',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    // positioned by wrapper centering
  },
  badge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#5A40EA',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '600', marginBottom: 24, color: '#333' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  actionItem: { alignItems: 'center', flex: 1 },
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
  platinumBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
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
  nameInput: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    borderBottomWidth: 1,
    width: '80%',
    textAlign: 'center',
  },
  descInput: {
    fontSize: 16,
    color: '#666',
    width: '90%',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 8,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#5A40EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  saveText: {
    color: '#FFF',
    fontSize: 14,
  },
});