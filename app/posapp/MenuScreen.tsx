import { useRouter } from 'expo-router'; // Si usas expo-router
import {
  addDoc, collection, deleteDoc,
  doc, getDocs, orderBy, query,
  updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert, FlatList,
  StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { db } from '../../firebaseConfig';

export default function MenuScreen() {
  // Estado con TODOS los items
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para creación de nuevo ítem
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [newItemAvailability, setNewItemAvailability] = useState(true);

  // Modo de vista (filtro): all, available, unavailable
  const [viewMode, setViewMode] = useState('all');

  // Modo edición
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Drawer manual
  const [drawerOpen, setDrawerOpen] = useState(false);

  const router = useRouter();

  // Cargar items de la colección "menu"
  const loadMenu = async () => {
    try {
      const q = query(collection(db, 'menu'), orderBy('name', 'asc'));
      const querySnap = await getDocs(q);
      const items: any[] = [];
      querySnap.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMenuItems(items);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar menú:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando ítems del menú...</Text>
      </View>
    );
  }

  // Filtrar ítems según viewMode
  // Asumimos que "available" se guarda como un boolean en Firestore
  const filteredItems = menuItems.filter((item) => {
    if (viewMode === 'all') return true;
    if (viewMode === 'available') return item.available === true;
    if (viewMode === 'unavailable') return item.available === false;
    return false;
  });

  // Crear / Editar item
  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemPrice.trim()) {
      Alert.alert('Faltan datos', 'Por favor ingresa nombre y precio');
      return;
    }

    try {
      if (editingItemId) {
        // Editar
        const ref = doc(db, 'menu', editingItemId);
        await updateDoc(ref, {
          name: itemName,
          price: parseFloat(itemPrice),
          category: itemCategory || 'General',
          available: newItemAvailability,
        });
      } else {
        // Crear nuevo
        await addDoc(collection(db, 'menu'), {
          name: itemName,
          price: parseFloat(itemPrice),
          category: itemCategory || 'General',
          available: newItemAvailability,
        });
      }

      // Limpieza
      setItemName('');
      setItemPrice('');
      setItemCategory('');
      setNewItemAvailability(true);
      setEditingItemId(null);

      loadMenu();
    } catch (error) {
      console.error('Error al guardar ítem:', error);
    }
  };

  // Función para iniciar edición
  const startEditing = (item: any) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemCategory(item.category);
    setNewItemAvailability(item.available);
  };

  // Eliminar item
  const deleteItem = async (itemId: string) => {
    try {
      const ref = doc(db, 'menu', itemId);
      await deleteDoc(ref);
      loadMenu();
    } catch (error) {
      console.error('Error al eliminar ítem:', error);
    }
  };

  // Cambiar disponibilidad de un item (similar a cambiar mesa ocupada)
  const toggleAvailability = async (itemId: string, currentAvailability: boolean) => {
    try {
      const ref = doc(db, 'menu', itemId);
      await updateDoc(ref, { available: !currentAvailability });
      loadMenu();
    } catch (error) {
      console.error('Error al actualizar disponibilidad:', error);
    }
  };

  // Contar cuántos disponibles vs no disponibles
  const availableCount = menuItems.filter((i) => i.available === true).length;
  const unavailableCount = menuItems.filter((i) => i.available === false).length;

  return (
    <View style={styles.container}>

      {/* Botón para abrir Drawer */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerOpen(true)}>
        <Text style={styles.menuButtonText}>≡</Text>
      </TouchableOpacity>

      {/* Header verde */}
      <View style={styles.header}>
        {/* Puedes incluir un logo si quieres, como en POS */}
        {/* <Image source={require('../../assets/images/pos-logo.png')} style={styles.logo} /> */}
        <Text style={styles.headerTitle}>Menú - POSApp</Text>
      </View>

      {/* Barra de filtros */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'all' && styles.activeButton]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'all' && styles.activeText]}>
            Ver Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'available' && styles.activeButton]}
          onPress={() => setViewMode('available')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'available' && styles.activeText]}>
            Disponibles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'unavailable' && styles.activeButton]}
          onPress={() => setViewMode('unavailable')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'unavailable' && styles.activeText]}>
            No Disponibles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      <View style={styles.mainContent}>
        <Text style={styles.welcomeText}>Gestiona el Menú</Text>
        <Text style={styles.instructions}>Añade o edita los platos / productos</Text>

        {/* Formulario de item */}
        <TextInput
          style={styles.input}
          placeholder="Nombre del ítem"
          value={itemName}
          onChangeText={setItemName}
        />
        <TextInput
          style={styles.input}
          placeholder="Precio"
          keyboardType="numeric"
          value={itemPrice}
          onChangeText={setItemPrice}
        />
        <TextInput
          style={styles.input}
          placeholder="Categoría (opcional)"
          value={itemCategory}
          onChangeText={setItemCategory}
        />

        {/* Toggle de disponibilidad para el nuevo/edición */}
        <TouchableOpacity
          style={[styles.statusButton, newItemAvailability ? styles.available : styles.occupied]}
          onPress={() => setNewItemAvailability(!newItemAvailability)}
        >
          <Text style={styles.statusButtonText}>
            {newItemAvailability ? 'Disponible' : 'No Disponible'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={handleSaveItem}>
          <Text style={styles.addButtonText}>
            {editingItemId ? 'Guardar Cambios' : 'Agregar Ítem'}
          </Text>
        </TouchableOpacity>

        {/* Lista de ítems filtrados */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          style={{ width: '100%', marginTop: 20 }}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemStatus}>
                Precio: ${item.price} | Cat: {item.category || 'General'}
              </Text>
              <Text style={styles.itemStatus}>
                Estado: {item.available ? 'Disponible' : 'No Disponible'}
              </Text>

              {/* Botones */}
              <TouchableOpacity
                style={[styles.button, item.available ? styles.available : styles.occupied]}
                onPress={() => toggleAvailability(item.id, item.available)}
              >
                <Text style={styles.buttonText}>
                  {item.available ? 'Marcar No Disponible' : 'Marcar Disponible'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => startEditing(item)}
              >
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteItem(item.id)}
              >
                <Text style={styles.buttonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Estadísticas al final */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Disponibles</Text>
          <Text style={styles.statValue}>{availableCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>No Disponibles</Text>
          <Text style={styles.statValue}>{unavailableCount}</Text>
        </View>
      </View>

      {/* Drawer manual */}
      {drawerOpen && (
        <View style={styles.drawerContainer}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menú de Opciones</Text>
            
            {/* Ir a Pantalla de Mesas */}
            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/posapp/posapp');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Ir a Mesas</Text>
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

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f9',
    padding: 20,
  },
  menuButton: {
    position: 'absolute',
    top: 25,
    left: 25,
    zIndex: 999,
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 5,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
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
    width: '31%',
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
    color: '#fff',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  instructions: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  input: {
    width: '80%',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 10,
  },
  statusButton: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  itemCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemStatus: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 3,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    alignItems: 'center',
  },
  available: {
    backgroundColor: '#2ecc71',
  },
  occupied: {
    backgroundColor: '#e74c3c',
  },
  editButton: {
    marginTop: 5,
    backgroundColor: '#2980b9',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButton: {
    marginTop: 5,
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
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
  // Drawer manual
  drawerContainer: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    width: 200, height: '100%',
    backgroundColor: '#ecf0f1',
    padding: 20,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  drawerOption: {
    backgroundColor: '#bdc3c7',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  drawerOptionText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
});