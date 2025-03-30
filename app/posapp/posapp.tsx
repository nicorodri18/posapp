import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig'; // Importa Firestore

export default function POSAppScreen() {
  const [tables, setTables] = useState<any[]>([]); // Estado para las mesas
  const [loading, setLoading] = useState(true);
  const [newTableNumber, setNewTableNumber] = useState(''); // Número de mesa nuevo
  const [newTableStatus, setNewTableStatus] = useState('Disponible'); // Estado de la mesa
  const [viewMode, setViewMode] = useState('all'); // Estado para controlar qué mesas mostrar: 'all', 'available' o 'occupied'

  // Función para cargar las mesas desde Firestore
  const loadTables = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'tables')); // Obtiene las mesas de la colección
      const tablesData: any[] = [];
      querySnapshot.forEach((doc) => {
        tablesData.push({ id: doc.id, ...doc.data() });
      });
      setTables(tablesData); // Establece las mesas en el estado
      setLoading(false); // Termina de cargar
    } catch (error) {
      console.error("Error al cargar las mesas: ", error);
      setLoading(false); // En caso de error, dejamos de cargar
    }
  };

  // Función para agregar una nueva mesa
  const addNewTable = async () => {
    if (newTableNumber === '') {
      Alert.alert('Por favor ingresa un número de mesa.');
      return;
    }

    try {
      await addDoc(collection(db, 'tables'), {
        number: parseInt(newTableNumber),
        status: newTableStatus, // El estado inicial es "Disponible"
      });
      setNewTableNumber(''); // Limpiar el campo de número de mesa
      loadTables(); // Vuelve a cargar las mesas
    } catch (error) {
      console.error("Error al agregar la mesa: ", error);
    }
  };

  // Función para actualizar el estado de la mesa
  const toggleTableStatus = async (tableId: string, currentStatus: string) => {
    try {
      const tableRef = doc(db, 'tables', tableId); // Obtiene la referencia de la mesa en Firestore
      const newStatus = currentStatus === 'Disponible' ? 'Ocupada' : 'Disponible'; // Cambia el estado
      await updateDoc(tableRef, {
        status: newStatus, // Actualiza el estado de la mesa
      });
      loadTables(); // Vuelve a cargar las mesas con el estado actualizado
    } catch (error) {
      console.error("Error al actualizar el estado de la mesa: ", error);
    }
  };

  // Función para eliminar una mesa
  const deleteTable = async (tableId: string) => {
    try {
      const tableRef = doc(db, 'tables', tableId); // Obtiene la referencia de la mesa en Firestore
      await deleteDoc(tableRef); // Elimina el documento de la mesa
      loadTables(); // Vuelve a cargar las mesas después de eliminar
    } catch (error) {
      console.error("Error al eliminar la mesa: ", error);
    }
  };

  // Función para filtrar mesas según el modo de vista seleccionado
  const filteredTables = tables.filter((table) => {
    if (viewMode === 'all') return true;
    if (viewMode === 'available') return table.status === 'Disponible'; // Coincide con el valor real en Firestore
    if (viewMode === 'occupied') return table.status === 'Ocupada'; // Coincide con el valor real en Firestore
    return false; // Por si acaso
  });

  useEffect(() => {
    loadTables(); // Carga las mesas cuando el componente se monta
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando mesas...</Text>
      </View>
    );
  }

  // Contabilizar mesas ocupadas y disponibles
  const occupiedCount = tables.filter((table) => table.status === 'Ocupada').length;
  const availableCount = tables.filter((table) => table.status === 'Disponible').length;

  return (
    <View style={styles.container}>
      {/* Barra superior */}
      <View style={styles.header}>
        <Image source={require('../../assets/images/pos-logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>POSApp</Text>
      </View>

      {/* Barra para seleccionar mesas */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'all' && styles.activeButton]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'all' && styles.activeText]}>Ver Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'available' && styles.activeButton]}
          onPress={() => setViewMode('available')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'available' && styles.activeText]}>Ver Disponibles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'occupied' && styles.activeButton]}
          onPress={() => setViewMode('occupied')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'occupied' && styles.activeText]}>Ver Ocupadas</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      <View style={styles.mainContent}>
        <Text style={styles.welcomeText}>Bienvenido, Administrador</Text>
        <Text style={styles.instructions}>Elige una mesa para gestionar</Text>

        {/* Input para agregar una nueva mesa */}
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

        {/* Lista de mesas filtrada */}
        <FlatList
          data={filteredTables}
          keyExtractor={(item) => item.id}
          extraData={viewMode} // Forza el renderizado cuando cambia viewMode
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
              {/* Botón para eliminar mesa */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTable(item.id)}
              >
                <Text style={styles.deleteButtonText}>Eliminar Mesa</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Estadísticas */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f9',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center', // Centra el contenido de la barra
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingVertical: 15, // Da más espacio vertical
    borderRadius: 10,
    marginBottom: 20,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 10, // Espacio entre logo y título
  },
  headerTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    width: '30%',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#2ecc71',
  },
  filterButtonText: {
    fontSize: 16,
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#fff', // Cambia el color del texto cuando está activo
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  instructions: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    width: '80%',
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  tableCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tableStatus: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  available: {
    backgroundColor: '#2ecc71',
  },
  occupied: {
    backgroundColor: '#e74c3c',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e74c3c',
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  loadingText: {
    fontSize: 18,
    color: '#7f8c8d',
  },
});