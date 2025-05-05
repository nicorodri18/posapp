import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
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
import { auth, db } from '../../firebaseConfig'; // Asumiendo que tienes una referencia a tu base de datos Firebase

export default function HomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Nuevo campo para el nombre
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (isRegistering) {
        // Crear cuenta de usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Actualizar el perfil con el nombre
        await updateProfile(user, { displayName: name });

        // Crear documento para almacenar puntos
        await db.collection('users').doc(user.uid).set({
          name,
          email,
          points: 0, // Puntos iniciales
        });

        Alert.alert('Cuenta creada', 'Puedes iniciar sesión ahora.');
        setIsRegistering(false);
        setIsLoading(false);
        return;
      }

      // Iniciar sesión con cuenta existente
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verificar si es admin o cliente
      if (user.email === 'admin@gmail.com') {
        router.replace('/adminDashboard'); // Ruta de administrador
      } else {
        router.replace('/client/ProfileScreen'); // Ruta de cliente con su perfil y puntos
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
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#999"
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff', // Fondo blanco
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: '#e60012', // Rojo similar a Puntos Colombia
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    width: '85%',
    backgroundColor: '#f1f1f1', // Fondo gris claro para los inputs
    color: '#333', // Color de texto oscuro
    padding: 12,
    marginBottom: 12,
    borderRadius: 8, // Bordes más redondeados
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e60012', // Rojo de Puntos Colombia
    padding: 12,
    borderRadius: 8, // Bordes más redondeados
    width: '85%',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkText: {
    color: '#e60012', // Rojo de Puntos Colombia
    marginTop: 12,
    fontSize: 14,
    textDecorationLine: 'underline', // Subrayado
  },
});