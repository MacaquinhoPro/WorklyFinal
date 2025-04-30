import React from 'react';
import { View, TextInput, Button, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, addDoc, updateDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '../utils/firebaseconfig';
import { router, useLocalSearchParams } from 'expo-router';

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
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginVertical: 8,
    borderRadius: 4,
  },
  err: {
    color: 'red',
    marginBottom: 8,
  },
});

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  pay: z.string().min(1, 'Pay is required'),
  duration: z.string().min(1, 'Duration is required'),
  requirements: z.string().min(1, 'Requirements are required'),
});

// ...importaciones sin cambios...

export default function Publish() {
    const { jobId } = useLocalSearchParams<{ jobId?: string }>();
    const isEdit = Boolean(jobId);
  
    const {
      control,
      handleSubmit,
      formState: { errors, isSubmitting },
      reset,
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
  
    /* --- cargar oferta si es edición --- */
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
        }
      })();
    }, []);
  
    /* --- enviar --- */
    const onSubmit = async (data: Form) => {
      try {
        const payload = {
          ownerUid: auth.currentUser!.uid,
          title: data.title,
          description: data.description,
          pay: data.pay,
          duration: data.duration,
          requirements: data.requirements.split(',').map((t) => t.trim()),
          createdAt: serverTimestamp(),
        };
        if (isEdit) await updateDoc(doc(db, 'jobs', jobId!), payload);
        else        await addDoc(collection(db, 'jobs'), payload);
  
        Alert.alert('Éxito', isEdit ? 'Puesto actualizado' : 'Puesto publicado');
        router.replace('/hiring/myJobs');
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    };
  
    /* --- campo reutilizable --- */
    const Field = ({ name, placeholder, multiline=false }:{
      name: keyof Form; placeholder: string; multiline?: boolean;
    }) => (
      <>
        <Controller
          control={control}
          name={name}
          render={({ field:{ value,onChange,onBlur } }) => (
            <TextInput
              style={[
                styles.input,
                multiline && { height: 100, textAlignVertical: 'top' },
              ]}
              placeholder={placeholder}
              multiline={multiline}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        {errors[name] && <Text style={styles.err}>{errors[name]?.message}</Text>}
      </>
    );
  
    /* --- UI --- */
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Field name="title"        placeholder="Título del puesto" />
        <Field name="description"  placeholder="Descripción" multiline />
        <Field name="pay"          placeholder="Pago / salario" />
        <Field name="duration"     placeholder="Duración (p.ej. tiempo completo)" />
        <Field name="requirements" placeholder="Requisitos (separados por coma)" />
        <Button
          title={isEdit ? 'Guardar cambios' : 'Publicar'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />
      </ScrollView>
    );
  }
  