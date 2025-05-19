import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function HomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });

        await setDoc(doc(db, 'users', userCred.user.uid), {
          name,
          email,
          points: 0,
        });

        Alert.alert('Cuenta creada', 'Ya puedes iniciar sesión');
        setIsRegistering(false);
        setEmail('');
        setPassword('');
        setName('');
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        if (user.email === 'admin@gmail.com') {
          router.replace('/admin/adminDashboard'); // asegúrate de que esta ruta existe
        } else {
          router.replace('/client/MenuScreen'); // asegúrate de que esta ruta existe
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/logo.png')} style={styles.logo} />

      <Text style={styles.title}>
        {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
      </Text>

      {isRegistering && (
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
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
    backgroundColor: '#fff', paddingHorizontal: 20,
  },
  logo: {
    width: 120, height: 120, resizeMode: 'contain', marginBottom: 20,
  },
  title: {
    fontSize: 22, color: '#e60012', fontWeight: 'bold', marginBottom: 10,
  },
  input: {
    width: '85%', backgroundColor: '#f1f1f1',
    color: '#333', padding: 12, marginBottom: 12,
    borderRadius: 8, fontSize: 16,
  },
  button: {
    backgroundColor: '#e60012', padding: 12,
    borderRadius: 8, width: '85%',
    alignItems: 'center', marginVertical: 10,
  },
  buttonText: {
    color: 'white', fontSize: 16, fontWeight: 'bold',
  },
  linkText: {
    color: '#e60012', marginTop: 12, fontSize: 14,
  },
});