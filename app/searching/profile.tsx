import React from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';

type Form = { bio: string; skills: string };

export default function SearchingProfile() {
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: { bio: '', skills: '' },
  });

  const onSubmit = async (d: Form) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        bio: d.bio,
        skills: d.skills.split(',').map((s) => s.trim()),
      });
      Alert.alert('Guardado');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const Field = ({ name, placeholder, multiline=false }: any) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextInput
          style={[s.inp, multiline && { height: 120, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          multiline={multiline}
          {...field}
        />
      )}
    />
  );

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Field name="bio" placeholder="Sobre mí" multiline />
      <Field name="skills" placeholder="Habilidades separadas por coma" />
      <Button title="Guardar" onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
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
