import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
            name="desktop-windows"
            size={40}
            color="#1351B4"
          />

          <Text style={styles.texto}>
            Permita o acesso à localização para exibir o mapa.
          </Text>
        </View>
      </View>
    );
  }

  const margem = 0.01;

  const urlMapa =
    'https://www.openstreetmap.org/export/embed.html' +
    `?bbox=${localizacao.longitude - margem}` +
    `%2C${localizacao.latitude - margem}` +
    `%2C${localizacao.longitude + margem}` +
    `%2C${localizacao.latitude + margem}` +
    '&layer=mapnik' +
    `&marker=${localizacao.latitude}%2C${localizacao.longitude}`;

  return (
    <View style={styles.container}>
      {React.createElement('iframe', {
        title: 'Mapa do ponto de embarque',
        src: urlMapa,
        style: {
          width: '100%',
          height: '100%',
          border: 0,
        },
      })}
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