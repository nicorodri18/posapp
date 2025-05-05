// app/client/MenuScreen.tsx
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../../firebaseConfig'; // Firebase configuration

export default function MenuScreen() {
  const [userData, setUserData] = useState({ name: '', points: 0 });
  const [productList, setProductList] = useState([
    { id: '1', name: 'Producto 1', pointsRequired: 100 },
    { id: '2', name: 'Producto 2', pointsRequired: 200 },
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          Alert.alert('Error', 'No se pudo cargar la información del usuario.');
        }
      }
    };

    fetchUserData();
  }, []);

  // Función para canjear puntos
  const handleRedeemProduct = async (productId: string, pointsRequired: number) => {
    if (userData.points >= pointsRequired) {
      const newPoints = userData.points - pointsRequired;
      const user = auth.currentUser;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        // Actualizar los puntos en Firestore
        await updateDoc(userDocRef, { points: newPoints });
        setUserData({ ...userData, points: newPoints });

        Alert.alert('Canje Exitoso', `Has canjeado el producto ${productId}.`);
      } catch (error) {
        console.error('Error redeeming product:', error);
        Alert.alert('Error', 'No se pudo realizar el canje.');
      }
    } else {
      Alert.alert('Error', 'No tienes suficientes puntos.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menú de Canje</Text>
      <Text style={styles.subtitle}>Puntos disponibles: {userData.points}</Text>

      {productList.map(product => (
        <View key={product.id} style={styles.productItem}>
          <Text>{product.name}</Text>
          <Text>Puntos requeridos: {product.pointsRequired}</Text>
          <Button
            title={`Canjear ${product.name}`}
            onPress={() => handleRedeemProduct(product.id, product.pointsRequired)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginVertical: 10,
  },
  productItem: {
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
});