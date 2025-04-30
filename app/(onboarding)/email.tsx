import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useOB } from './OnboardingContext';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function Email() {
  const { set, data } = useOB();
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: data.email ?? '' },
  });

  const onSubmit = (f: Form) => {
    set({ email: f.email });
    router.push('/(onboarding)/password');
  };

  return (
    <View style={styles.c}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextInput style={styles.inp} placeholder="E-mail" autoCapitalize="none"
            keyboardType="email-address" {...field} />
        )}
      />
      {errors.email && <Text style={styles.err}>{errors.email.message}</Text>}
      <Button title="Continuar" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
const styles = StyleSheet.create({ c:{ flex:1, justifyContent:'center',padding:24 },
inp:{ borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:12,marginBottom:10 },
err:{ color:'red' }});
