import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  addDoc, collection, deleteDoc,
  doc, getDocs, orderBy, query,
  updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert, FlatList, Image, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { db } from '../../firebaseConfig';
import { supabase } from '../../supabaseClient';

export default function MenuScreen() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [newItemAvailability, setNewItemAvailability] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [supabaseImages, setSupabaseImages] = useState<string[]>([]);

  const router = useRouter();

  useEffect(() => {
    loadMenu();
    loadImagesFromSupabase();
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

  const loadImagesFromSupabase = async () => {
    const { data, error } = await supabase.storage.from('galeriaposapp').list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.error('Error al listar imágenes:', error);
      return;
    }

    const urls = data
      .filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png'))
      .map(file => {
        return supabase.storage
          .from('galeriaposapp')
          .getPublicUrl(file.name).data.publicUrl;
      });

    setSupabaseImages(urls);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImageToSupabase = async () => {
    if (!imageUri) return;

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const fileName = `${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('galeriaposapp')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
        });

      if (error) {
        console.error('Error subiendo imagen:', error);
      } else {
        console.log('Imagen subida:', fileName);
        loadImagesFromSupabase(); // refrescar galería
      }
    } catch (uploadError) {
      console.error('Error al procesar imagen:', uploadError);
    }

    setImageUri(null);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemPrice.trim()) {
      Alert.alert('Faltan datos', 'Por favor ingresa nombre y precio');
      return;
    }

    try {
      if (editingItemId) {
        const ref = doc(db, 'menu', editingItemId);
        await updateDoc(ref, {
          name: itemName,
          price: parseFloat(itemPrice),
          category: itemCategory || 'General',
          available: newItemAvailability,
        });
      } else {
        await addDoc(collection(db, 'menu'), {
          name: itemName,
          price: parseFloat(itemPrice),
          category: itemCategory || 'General',
          available: newItemAvailability,
        });
      }

      setItemName('');
      setItemPrice('');
      setItemCategory('');
      setNewItemAvailability(true);
      setEditingItemId(null);
      loadMenu();

      if (imageUri) {
        await uploadImageToSupabase();
      }

    } catch (error) {
      console.error('Error al guardar ítem:', error);
    }
  };

  const startEditing = (item: any) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemCategory(item.category);
    setNewItemAvailability(item.available);
  };

  const deleteItem = async (id: string) => {
    try {
      const ref = doc(db, 'menu', id);
      await deleteDoc(ref);
      loadMenu();
    } catch (error) {
      console.error('Error al eliminar ítem:', error);
    }
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    try {
      const ref = doc(db, 'menu', id);
      await updateDoc(ref, { available: !current });
      loadMenu();
    } catch (error) {
      console.error('Error al actualizar disponibilidad:', error);
    }
  };

  const availableCount = menuItems.filter((i) => i.available).length;
  const unavailableCount = menuItems.filter((i) => !i.available).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando ítems del menú...</Text>
      </View>
    );
  }

  const filteredItems = menuItems.filter((item) => {
    if (viewMode === 'all') return true;
    if (viewMode === 'available') return item.available;
    if (viewMode === 'unavailable') return !item.available;
    return false;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menú - POSApp</Text>
      </View>

      <View style={styles.filterBar}>
        {['all', 'available', 'unavailable'].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.filterButton, viewMode === mode && styles.activeButton]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.filterButtonText, viewMode === mode && styles.activeText]}>
              {mode === 'all' ? 'Ver Todos' : mode === 'available' ? 'Disponibles' : 'No Disp.'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mainContent}>
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

        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
          <Text style={styles.addButtonText}>Seleccionar Imagen</Text>
        </TouchableOpacity>

        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={{ width: 100, height: 100, marginBottom: 10, borderRadius: 8 }}
          />
        )}

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

        {/* Render del menú (sin imagen) */}
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

      {/* Galería de imágenes de Supabase */}
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Galería de Imágenes</Text>
        <FlatList
          data={supabaseImages}
          keyExtractor={(uri) => uri}
          horizontal
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width: 120, height: 120, marginRight: 10, borderRadius: 8 }}
            />
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f9', padding: 15 },
  header: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', backgroundColor: '#2ecc71',
    paddingVertical: 10, borderRadius: 10, marginBottom: 10,
  },
  headerTitle: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  filterButton: {
    padding: 8, backgroundColor: '#ecf0f1',
    borderRadius: 5, width: '32%', alignItems: 'center',
  },
  activeButton: { backgroundColor: '#2ecc71' },
  filterButtonText: { fontSize: 14, color: '#2ecc71', fontWeight: 'bold' },
  activeText: { color: '#fff' },
  mainContent: { flex: 1, alignItems: 'center' },
  input: {
    width: '80%', padding: 8, backgroundColor: '#fff',
    borderRadius: 5, borderColor: '#ccc', borderWidth: 1, marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#2ecc71', padding: 12, width: '80%',
    borderRadius: 5, alignItems: 'center', marginBottom: 10,
  },
  addButtonText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  statusButton: {
    padding: 8, borderRadius: 5, marginBottom: 8,
  },
  statusButtonText: { color: '#fff', fontWeight: 'bold' },
  itemCard: {
    backgroundColor: '#fff', width: '80%', maxWidth: 400,
    padding: 12, borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#ddd',
  },
  itemTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  itemStatus: { fontSize: 13, color: '#7f8c8d', marginBottom: 2 },
  itemButton: { padding: 8, borderRadius: 5, marginTop: 5, alignItems: 'center' },
  available: { backgroundColor: '#2ecc71' },
  occupied: { backgroundColor: '#e74c3c' },
  editButton: { marginTop: 5, backgroundColor: '#2980b9', padding: 8, borderRadius: 5, alignItems: 'center' },
  deleteButton: { marginTop: 5, backgroundColor: '#e74c3c', padding: 8, borderRadius: 5, alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#7f8c8d' },
});