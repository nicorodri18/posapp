import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  FlatList,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../firebaseConfig';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron obtener los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'users'), {
        name: newUserName,
        email: newUserEmail,
        points: 0,
      });
      setUsers([...users, { id: docRef.id, name: newUserName, email: newUserEmail, points: 0 }]);
      setNewUserName('');
      setNewUserEmail('');
      setAddingUser(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear el usuario');
    }
  };

  const handleAddPoints = async () => {
    if (!selectedUser || isNaN(Number(pointsToAdd))) {
      Alert.alert('Error', 'Selecciona un usuario y pon un número válido');
      return;
    }

    const newTotal = selectedUser.points + Number(pointsToAdd);
    try {
      const ref = doc(db, 'users', selectedUser.id);
      await updateDoc(ref, { points: newTotal });
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, points: newTotal } : u));
      setSelectedUser(null);
      setPointsToAdd('');
      Alert.alert('Éxito', 'Puntos asignados');
    } catch (e) {
      Alert.alert('Error', 'No se pudo asignar puntos');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel del Administrador</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <>
          {users.length === 0 ? (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.subtitle}>No hay usuarios registrados.</Text>
              <TouchableOpacity style={styles.button} onPress={() => setAddingUser(true)}>
                <Text style={styles.buttonText}>Agregar Usuario</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => setSelectedUser(item)}
                  >
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userPoints}>Puntos: {item.points}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity onPress={() => setAddingUser(true)}>
                <Text style={styles.linkText}>+ Agregar nuevo usuario</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      {addingUser && (
        <View style={styles.form}>
          <Text style={styles.subtitle}>Nuevo Usuario</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={newUserName}
            onChangeText={setNewUserName}
          />
          <TextInput
            style={styles.input}
            placeholder="Correo"
            value={newUserEmail}
            onChangeText={setNewUserEmail}
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.button} onPress={handleAddUser}>
            <Text style={styles.buttonText}>Guardar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddingUser(false)}>
            <Text style={styles.linkText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedUser && (
        <View style={styles.form}>
          <Text style={styles.subtitle}>Asignar puntos a {selectedUser.name}</Text>
          <TextInput
            style={styles.input}
            placeholder="Puntos"
            value={pointsToAdd}
            onChangeText={setPointsToAdd}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.button} onPress={handleAddPoints}>
            <Text style={styles.buttonText}>Asignar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedUser(null)}>
            <Text style={styles.linkText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginVertical: 10, textAlign: 'center' },
  input: {
    borderWidth: 1, borderColor: '#ccc',
    padding: 10, borderRadius: 5, marginVertical: 5,
  },
  button: {
    backgroundColor: '#ff8c00', padding: 12,
    borderRadius: 5, alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  linkText: { color: '#007bff', marginTop: 10, textAlign: 'center' },
  form: { marginTop: 20 },
  userItem: {
    backgroundColor: '#f9f9f9', padding: 15, borderRadius: 5,
    marginVertical: 5, borderWidth: 1, borderColor: '#eee',
  },
  userName: { fontWeight: 'bold', fontSize: 16 },
  userEmail: { color: '#666' },
  userPoints: { marginTop: 4, fontWeight: '600' },
});