// app/client/ProfileScreen.tsx
import { doc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth, db } from '../../firebaseConfig'; // Firebase config

export default function ProfileScreen() {
  const [userData, setUserData] = useState({ name: '', points: 0 });
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          setNewName(userDoc.data().name);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleUpdateProfile = async () => {
    if (newName !== userData.name) {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { name: newName });
        setUserData({ ...userData, name: newName });
        Alert.alert('Perfil actualizado', 'Tu nombre ha sido actualizado.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Nombre: {userData.name}</Text>
      <Text style={styles.subtitle}>Puntos: {userData.points}</Text>
      <TextInput
        style={styles.input}
        value={newName}
        onChangeText={setNewName}
        placeholder="Nuevo nombre"
      />
      <Button title="Actualizar Nombre" onPress={handleUpdateProfile} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginVertical: 10,
  },
  input: {
    width: '80%',
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
  },
});