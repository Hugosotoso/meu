import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';

type Localizacao = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  localizacao: Localizacao | null;
};

export default function FrotaMap({ localizacao }: Props) {
  if (!localizacao) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <MaterialIcons
            name="satellite"
            size={40}
            color="#1351B4"
          />

          <Text style={styles.texto}>
            Buscando satélites GPS...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.mapa}
        initialRegion={localizacao}
        showsUserLocation
      >
        <Marker
          coordinate={localizacao}
          title="Sua Localização Atual"
          pinColor="#1351B4"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },

  mapa: {
    width: '100%',
    height: '100%',
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },

  texto: {
    marginTop: 10,
    color: '#555A60',
    textAlign: 'center',
    fontSize: 12,
  },
});