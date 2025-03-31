import { useRouter } from 'expo-router';
import {
  addDoc, collection, deleteDoc,
  doc, getDocs, orderBy, query,
  updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert, FlatList, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { db } from '../../firebaseConfig';

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Nuevo/edición
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [newItemAvailability, setNewItemAvailability] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Filtro: all, available, unavailable
  const [viewMode, setViewMode] = useState('all');

  // Drawer manual
  const [drawerOpen, setDrawerOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadMenu();
  }, []);

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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando ítems del menú...</Text>
      </View>
    );
  }

  // Filtrar
  const filteredItems = menuItems.filter((item) => {
    if (viewMode === 'all') return true;
    if (viewMode === 'available') return item.available;
    if (viewMode === 'unavailable') return !item.available;
    return false;
  });

  // Crear o editar
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
        // Crear
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

  // Iniciar edición
  const startEditing = (item: any) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemCategory(item.category);
    setNewItemAvailability(item.available);
  };

  // Eliminar
  const deleteItem = async (id: string) => {
    try {
      const ref = doc(db, 'menu', id);
      await deleteDoc(ref);
      loadMenu();
    } catch (error) {
      console.error('Error al eliminar ítem:', error);
    }
  };

  // Toggle disponibilidad
  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      const ref = doc(db, 'menu', id);
      await updateDoc(ref, { available: !current });
      loadMenu();
    } catch (error) {
      console.error('Error al actualizar disponibilidad:', error);
    }
  };

  // Conteo
  const availableCount = menuItems.filter((i) => i.available).length;
  const unavailableCount = menuItems.filter((i) => !i.available).length;

  return (
    <View style={styles.container}>
      {/* Drawer button */}
      <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerOpen(true)}>
        <Text style={styles.menuButtonText}>≡</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menú - POSApp</Text>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'all' && styles.activeButton]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'all' && styles.activeText]}>Ver Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'available' && styles.activeButton]}
          onPress={() => setViewMode('available')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'available' && styles.activeText]}>Disponibles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, viewMode === 'unavailable' && styles.activeButton]}
          onPress={() => setViewMode('unavailable')}
        >
          <Text style={[styles.filterButtonText, viewMode === 'unavailable' && styles.activeText]}>No Disp.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {/* Form */}
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

        {/* Lista centrada */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, marginTop: 15 }}
          contentContainerStyle={{ alignItems: 'center' }}
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
                style={[styles.itemButton, item.available ? styles.available : styles.occupied]}
                onPress={() => toggleAvailability(item.id, item.available)}
              >
                <Text style={styles.buttonText}>
                  {item.available ? 'Marcar No Disponible' : 'Marcar Disponible'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.editButton} onPress={() => startEditing(item)}>
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteItem(item.id)}>
                <Text style={styles.buttonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Stats */}
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
            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/posapp/posapp');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Ir a Mesas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerOption} onPress={() => setDrawerOpen(false)}>
              <Text style={styles.drawerOptionText}>Cerrar Drawer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Contenedor base
  container: {
    flex: 1,
    backgroundColor: '#f4f4f9',
    padding: 15, // <--- Bajamos a 15
  },
  // Botón para abrir Drawer
  menuButton: {
    position: 'absolute',
    top: 18,    // <--- Bajamos un poco
    left: 18,
    zIndex: 999,
    backgroundColor: '#2ecc71',
    padding: 8, // <--- Más pequeño
    borderRadius: 5,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16, // <--- Menos grande
    fontWeight: 'bold',
  },
  // Encabezado verde
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingVertical: 10, // <--- Menos padding vertical
    borderRadius: 10,
    marginBottom: 10,    // <--- Menos espacio
  },
  headerTitle: {
    fontSize: 20, // <--- Reducido
    color: '#fff',
    fontWeight: 'bold',
  },
  // Barra de filtros
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10, // <--- Menos espacio
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    width: '32%',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#2ecc71',
  },
  filterButtonText: {
    fontSize: 14, // <--- Un poco más pequeño
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  activeText: {
    color: '#fff',
  },
  // Contenido principal
  mainContent: {
    flex: 1,
    alignItems: 'center',
  },
  // Inputs y botones
  input: {
    width: '80%',
    padding: 8, // <--- Menos padding
    backgroundColor: '#fff',
    borderRadius: 5,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 8, // <--- Menos espacio
  },
  statusButton: {
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#2ecc71',
    padding: 12,
    width: '80%',
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14, // <--- Más pequeño
    color: '#fff',
    fontWeight: 'bold',
  },
  // Tarjeta de ítem
  itemCard: {
    backgroundColor: '#fff',
    width: '80%',
    maxWidth: 400,
    padding: 12, // <--- Menos padding
    borderRadius: 10,
    marginBottom: 10, // <--- Menos margen
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemTitle: {
    fontSize: 16, // <--- Un poco más chico
    fontWeight: 'bold',
    marginBottom: 3,
  },
  itemStatus: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  itemButton: {
    padding: 8,
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
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  deleteButton: {
    marginTop: 5,
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10, // <--- Menos margen
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 10, // <--- Menos padding
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  loadingText: {
    fontSize: 16,
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
    padding: 15,
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  drawerOption: {
    backgroundColor: '#bdc3c7',
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
  },
  drawerOptionText: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
});