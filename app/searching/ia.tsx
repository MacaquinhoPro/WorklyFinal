import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const GEMINI_API_KEY = 'AIzaSyCm6KBxmAH62LOkJVvzvvTU8UAfsAAK728';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

export default function IAChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
      });
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Lo siento, no obtuve respuesta.';
      const aiMsg: Message = { id: (Date.now() + 1).toString(), text: aiText, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = { id: (Date.now() + 2).toString(), text: 'Error de red. Intenta de nuevo.', sender: 'ai' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // Desplaza el teclado considerando el notch/dinamic island
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.chatContainer, { paddingTop: 8 }]}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.sender === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text style={item.sender === 'user' ? styles.userText : styles.aiText}>
                {item.text}
              </Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje..."
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <MaterialIcons name="send" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
  },
  chatContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#5A40EA',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E0E0',
  },
  userText: {
    color: '#FFF',
  },
  aiText: {
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    marginBottom: -34,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#5A40EA',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
});