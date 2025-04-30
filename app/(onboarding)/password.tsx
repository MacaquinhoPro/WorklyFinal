import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { useOB } from './OnboardingContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import React from 'react';

const schema = z.object({ password: z.string().min(6) });
type F = z.infer<typeof schema>;

export default function Password() {
  const { set, data } = useOB();
  const { control, handleSubmit, formState:{ errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { password: data.password ?? '' },
  });

  const onSubmit = (f: F) => {
    set({ password: f.password });
    router.push('/(onboarding)/firstname');
  };

  return (
    <View style={s.c}>
      <Controller control={control} name="password"
        render={({ field })=>(
          <TextInput style={s.inp} placeholder="Contraseña" secureTextEntry {...field}/>
        )}/>
      {errors.password && <Text style={s.err}>{errors.password.message}</Text>}
      <Button title="Continuar" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},
inp:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:12,marginBottom:10},
err:{color:'red'}});
