import React from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';
import { router } from 'expo-router';

interface Form {
  companyName: string;
  bio: string;
}

export default function CompanyProfile() {
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: { companyName: '', bio: '' },
  });

  const onSubmit = async (d: Form) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), { companyName: d.companyName, bio: d.bio });
      Alert.alert('Guardado');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Controller
        control={control}
        name="companyName"
        render={({ field }) => (
          <TextInput style={s.inp} placeholder="Nombre de empresa" {...field} />
        )}
      />
      <Controller
        control={control}
        name="bio"
        render={({ field }) => (
          <TextInput
            style={[s.inp, { height: 120, textAlignVertical: 'top' }]}
            placeholder="Descripción / bio"
            multiline
            {...field}
          />
        )}
      />
      <Button title="Guardar perfil" onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
    </View>
  );
}

const s = StyleSheet.create({
  inp: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});
