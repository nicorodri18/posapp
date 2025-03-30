// app/tabs/index.tsx
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig'; // Asegúrate de que la ruta sea correcta

export default function HomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Redirigir a la ruta absoluta '/posapp/posapp' después del login
      router.replace('/posapp/posapp');  // Ruta absoluta hacia posapp
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/pos-logo.png')} style={styles.logo} />

      <Text style={styles.title}>
        {isRegistering ? 'Crear Cuenta en POSAPP' : 'Iniciar Sesión en POSAPP'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#ccc"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#ccc"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
        <Text style={styles.linkText}>
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e1e1e', paddingHorizontal: 20,
  },
  logo: {
    width: 120, height: 120,
    resizeMode: 'contain', marginBottom: 20,
  },
  title: {
    fontSize: 22, color: 'white',
    fontWeight: 'bold', marginBottom: 10,
  },
  input: {
    width: '85%', backgroundColor: '#2a2a2a',
    color: 'white', padding: 12, marginBottom: 12,
    borderRadius: 5, fontSize: 16,
  },
  button: {
    backgroundColor: '#ff8c00', padding: 12,
    borderRadius: 5, width: '85%',
    alignItems: 'center', marginVertical: 10,
  },
  buttonText: {
    color: 'white', fontSize: 16, fontWeight: 'bold',
  },
  linkText: {
    color: '#ff8c00', marginTop: 12, fontSize: 14,
  },
});