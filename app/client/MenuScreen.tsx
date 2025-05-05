import { useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function MenuScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const q = query(collection(db, 'users'), where('email', '==', user.email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setUserData(docData);
        }
      } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e60012" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Hola, {userData?.name || 'Cliente'}!</Text>
      <Text style={styles.points}>Tienes {userData?.points ?? 0} puntos</Text>

      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionButton} onPress={() => alert('Canjeo de puntos próximamente')}>
          <Text style={styles.sectionText}>🎁 Canjear puntos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sectionButton} onPress={() => alert('Historial de compras próximamente')}>
          <Text style={styles.sectionText}>🛒 Historial de compras</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sectionButton} onPress={() => alert('Perfil próximamente')}>
          <Text style={styles.sectionText}>👤 Mi perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logoutButton}>
        <Button title="Cerrar sesión" color="#e60012" onPress={handleLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#222' },
  points: { fontSize: 20, textAlign: 'center', marginBottom: 30, color: '#444' },
  section: { gap: 15, alignItems: 'center' },
  sectionButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
    elevation: 2,
  },
  sectionText: { fontSize: 18, color: '#333' },
  logoutButton: { marginTop: 40 },
});