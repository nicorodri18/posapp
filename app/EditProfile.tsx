import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db, storage } from '../firebaseConfig';

interface UserData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  photoURL?: string;
  points: number;
  pointsExpiry?: Date;
}

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          name: data.name || user.displayName || 'Usuario',
          email: user.email || '',
          phone: data.phone || '',
          address: data.address || '',
          photoURL: user.photoURL || data.photoURL,
          points: data.points || 0,
          pointsExpiry: data.pointsExpiry?.toDate(),
        });
      }
    } catch (error) {
      console.error('Error al obtener datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setTempPhoto(null);
    fetchUserData(); // Resetear a los datos originales
  };

  const handleChange = (field: keyof UserData, value: string) => {
    if (userData) {
      setUserData({ ...userData, [field]: value });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setTempPhoto(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `profile_pictures/${user?.uid}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSave = async () => {
    if (!user || !userData) return;

    try {
      setLoading(true);
      
      // Actualizar foto de perfil si hay una nueva
      let photoURL = userData.photoURL;
      if (tempPhoto) {
        photoURL = await uploadImage(tempPhoto);
        await updateProfile(user, { photoURL });
      }

      // Actualizar datos en Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        photoURL: photoURL,
      });

      // Actualizar datos en Auth si el nombre cambió
      if (user.displayName !== userData.name) {
        await updateProfile(user, {
          displayName: userData.name,
        });
      }

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setEditing(false);
      setTempPhoto(null);
    } catch (error) {
      console.error('Error al actualizar:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        {editing ? (
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleEdit}>
            <MaterialIcons name="edit" size={24} color="#00A859" />
          </TouchableOpacity>
        )}
      </View>

      {/* User Info */}
      <View style={styles.card}>
        <TouchableOpacity onPress={editing ? pickImage : undefined}>
          <Image
            source={{ uri: tempPhoto || userData?.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg' }}
            style={styles.avatar}
          />
          {editing && (
            <View style={styles.editPhotoBadge}>
              <MaterialIcons name="camera-alt" size={20} color="white" />
            </View>
          )}
        </TouchableOpacity>

        {editing ? (
          <>
            <TextInput
              style={styles.input}
              value={userData?.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="Nombre completo"
            />
            <TextInput
              style={styles.input}
              value={userData?.email}
              editable={false}
              placeholder="Correo electrónico"
            />
            <TextInput
              style={styles.input}
              value={userData?.phone}
              onChangeText={(text) => handleChange('phone', text)}
              placeholder="Teléfono"
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={userData?.address}
              onChangeText={(text) => handleChange('address', text)}
              placeholder="Dirección"
            />
          </>
        ) : (
          <>
            <Text style={styles.userName}>{userData?.name}</Text>
            <Text style={styles.userEmail}>{userData?.email}</Text>
            {userData?.phone && <Text style={styles.userDetail}>📱 {userData.phone}</Text>}
            {userData?.address && <Text style={styles.userDetail}>🏠 {userData.address}</Text>}
          </>
        )}
      </View>

      {/* Points */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puntos disponibles</Text>
        <Text style={styles.pointsValue}>{userData?.points}</Text>
        <Text style={styles.expiry}>Expiran: {formatDate(userData?.pointsExpiry)}</Text>
      </View>

      {/* Save Button */}
      {editing && (
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    color: '#E74C3C',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  editPhotoBadge: {
    position: 'absolute',
    right: 10,
    bottom: 20,
    backgroundColor: '#00A859',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  userDetail: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222',
    textAlign: 'center',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00A859',
    textAlign: 'center',
    marginBottom: 4,
  },
  expiry: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#00A859',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});