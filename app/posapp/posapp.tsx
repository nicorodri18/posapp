import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../../firebaseConfig';

export default function POSAppScreen() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableStatus, setNewTableStatus] = useState('Disponible');
  const [viewMode, setViewMode] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  const loadTables = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tables'));
      const tablesData: any[] = [];
      querySnapshot.forEach((docSnap) => {
        tablesData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTables(tablesData);
      setLoading(false);
    } catch (error) {
      console.error("Error al cargar las mesas: ", error);
      setLoading(false);
    }
  };

  const addNewTable = async () => {
    if (newTableNumber === '') {
      Alert.alert('Por favor ingresa un número de mesa.');
      return;
    }
    try {
      await addDoc(collection(db, 'tables'), {
        number: parseInt(newTableNumber),
        status: newTableStatus,
      });
      setNewTableNumber('');
      loadTables();
    } catch (error) {
      console.error("Error al agregar la mesa: ", error);
    }
  };

  const toggleTableStatus = async (tableId: string, currentStatus: string) => {
    try {
      const tableRef = doc(db, 'tables', tableId);
      const newStatus = currentStatus === 'Disponible' ? 'Ocupada' : 'Disponible';
      await updateDoc(tableRef, { status: newStatus });
      loadTables();
    } catch (error) {
      console.error("Error al actualizar el estado de la mesa: ", error);
    }
  };

  const deleteTable = async (tableId: string) => {
    try {
      const tableRef = doc(db, 'tables', tableId);
      await deleteDoc(tableRef);
      loadTables();
    } catch (error) {
      console.error("Error al eliminar la mesa: ", error);
    }
  };

  const filteredTables = tables.filter((table) => {
    if (viewMode === 'all') return true;
    if (viewMode === 'available') return table.status === 'Disponible';
    if (viewMode === 'occupied') return table.status === 'Ocupada';
    return false;
  });

  useEffect(() => {
    loadTables();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando mesas...</Text>
      </View>
    );
  }

  const occupiedCount = tables.filter((t) => t.status === 'Ocupada').length;
  const availableCount = tables.filter((t) => t.status === 'Disponible').length;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerOpen(true)}>
        <Text style={styles.menuButtonText}>≡</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Image source={require('../../assets/images/pos-logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>POSApp</Text>
      </View>

      <View style={styles.filterBar}>
        {['all', 'available', 'occupied'].map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.filterButton, viewMode === mode && styles.activeButton]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.filterButtonText, viewMode === mode && styles.activeText]}>
              {mode === 'all' ? 'Ver Todas' : mode === 'available' ? 'Disponibles' : 'Ocupadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.welcomeText}>Bienvenido, Administrador</Text>
        <Text style={styles.instructions}>Elige una mesa para gestionar</Text>

        <TextInput
          style={styles.input}
          value={newTableNumber}
          onChangeText={setNewTableNumber}
          placeholder="Número de mesa"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addButton} onPress={addNewTable}>
          <Text style={styles.addButtonText}>Agregar Mesa</Text>
        </TouchableOpacity>

        <FlatList
          data={filteredTables}
          keyExtractor={(item) => item.id}
          extraData={viewMode}
          renderItem={({ item }) => (
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Mesa {item.number}</Text>
              <Text style={styles.tableStatus}>Estado: {item.status}</Text>

              <TouchableOpacity
                style={[styles.button, item.status === 'Disponible' ? styles.available : styles.occupied]}
                onPress={() => toggleTableStatus(item.id, item.status)}
              >
                <Text style={styles.buttonText}>
                  {item.status === 'Disponible' ? 'Marcar como Ocupada' : 'Marcar como Disponible'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTable(item.id)}>
                <Text style={styles.deleteButtonText}>Eliminar Mesa</Text>
              </TouchableOpacity>

              {/* QR dinámico */}
              <View style={{ marginTop: 10, alignItems: 'center' }}>
                <QRCode value={`mesa_${item.id}`} size={100} />
                <Text style={{ marginTop: 5, fontSize: 12 }}>QR mesa_{item.id}</Text>
              </View>
            </View>
          )}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Mesas Disponibles</Text>
          <Text style={styles.statValue}>{availableCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Mesas Ocupadas</Text>
          <Text style={styles.statValue}>{occupiedCount}</Text>
        </View>
      </View>

      {drawerOpen && (
        <View style={styles.drawerContainer}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menú de Opciones</Text>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/posapp/MenuScreen');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Ir a Menú</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/chef/KitchenScreen');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Ver Pedidos (Cocina)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={async () => {
                await auth.signOut();
                router.replace('/');
              }}
            >
              <Text style={styles.drawerOptionText}>Cerrar sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => setDrawerOpen(false)}
            >
              <Text style={styles.drawerOptionText}>Cerrar Drawer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f9', padding: 20 },
  loadingText: { fontSize: 18, color: '#7f8c8d' },
  menuButton: {
    position: 'absolute', top: 25, left: 25, zIndex: 999,
    backgroundColor: '#2ecc71', padding: 10, borderRadius: 5,
  },
  menuButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  header: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#2ecc71', paddingVertical: 15, borderRadius: 10, marginBottom: 20,
  },
  logo: { width: 40, height: 40, resizeMode: 'contain', marginRight: 10 },
  headerTitle: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  filterButton: {
    padding: 10, backgroundColor: '#ecf0f1', borderRadius: 5,
    width: '30%', alignItems: 'center',
  },
  activeButton: { backgroundColor: '#2ecc71' },
  filterButtonText: { fontSize: 16, color: '#2ecc71', fontWeight: 'bold' },
  activeText: { color: '#fff' },
  mainContent: { flex: 1, alignItems: 'center', marginTop: 60 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', marginVertical: 10 },
  instructions: { fontSize: 16, color: '#7f8c8d', marginBottom: 20 },
  input: {
    width: '80%', padding: 10, backgroundColor: '#fff',
    borderRadius: 5, borderColor: '#ccc', borderWidth: 1, marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#2ecc71', padding: 15, width: '80%',
    borderRadius: 5, alignItems: 'center',
  },
  addButtonText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  tableCard: {
    backgroundColor: '#fff', padding: 20, borderRadius: 10,
    marginVertical: 10, width: '100%', borderColor: '#ddd', borderWidth: 1,
  },
  tableTitle: { fontSize: 18, fontWeight: 'bold' },
  tableStatus: { fontSize: 16, color: '#7f8c8d' },
  button: { padding: 10, borderRadius: 5, marginTop: 10 },
  available: { backgroundColor: '#2ecc71' },
  occupied: { backgroundColor: '#e74c3c' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  deleteButton: {
    marginTop: 10, padding: 10, backgroundColor: '#e74c3c',
    borderRadius: 5, alignItems: 'center',
  },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  statsContainer: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 20,
  },
  statCard: {
    backgroundColor: '#fff', padding: 15, borderRadius: 10,
    width: '48%', alignItems: 'center', borderColor: '#ddd', borderWidth: 1,
  },
  statTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#2ecc71' },
  drawerContainer: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    width: 200, height: '100%', backgroundColor: '#ecf0f1', padding: 20,
  },
  drawerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  drawerOption: {
    backgroundColor: '#bdc3c7', padding: 10, borderRadius: 5, marginBottom: 10,
  },
  drawerOptionText: { color: '#2c3e50', fontWeight: 'bold' },
});