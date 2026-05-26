import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { appAlert } from '../../lib/appAlert';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';
import { reverseGeocode, type ResolvedAddress } from '../../lib/geocoding';

export interface DeliveryLocation {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: DeliveryLocation;
  onChange: (location: DeliveryLocation) => void;
  onAddressResolved?: (address: ResolvedAddress) => void;
  initialRegion?: Region;
}

const DEFAULT_REGION: Region = {
  latitude: 8.8864,
  longitude: -12.0442,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export function LocationPicker({
  value,
  onChange,
  onAddressResolved,
  initialRegion = DEFAULT_REGION,
}: LocationPickerProps) {
  const [loadingGps, setLoadingGps] = useState(false);

  const resolveAddress = async (lat: number, lng: number) => {
    if (!onAddressResolved) return;
    const address = await reverseGeocode(lat, lng);
    if (address) {
      onAddressResolved(address);
    }
  };

  const setLocation = (coords: DeliveryLocation, fillAddress: boolean) => {
    onChange(coords);
    if (fillAddress) {
      void resolveAddress(coords.lat, coords.lng);
    }
  };

  const useCurrentLocation = async () => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        appAlert('Location permission', 'Allow location access to pin your delivery address on the map.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true);
    } catch {
      appAlert('Location error', 'Could not get your current location. Tap the map to set your address.');
    } finally {
      setLoadingGps(false);
    }
  };

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLocation({ lat: latitude, lng: longitude }, true);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>Delivery location</Text>
        <TouchableOpacity style={styles.gpsBtn} onPress={useCurrentLocation} disabled={loadingGps}>
          <Ionicons name="locate" size={16} color={colors.darkBlue} />
          <Text style={styles.gpsText}>{loadingGps ? 'Locating…' : 'Use my location'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Tap the map or use GPS — your street and city will fill in automatically.</Text>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        region={{
          latitude: value.lat,
          longitude: value.lng,
          latitudeDelta: initialRegion.latitudeDelta,
          longitudeDelta: initialRegion.longitudeDelta,
        }}
        onPress={onMapPress}
      >
        <Marker
          coordinate={{ latitude: value.lat, longitude: value.lng }}
          draggable
          onDragEnd={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setLocation({ lat: latitude, lng: longitude }, true);
          }}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { color: colors.softGray, fontSize: 13 },
  hint: { color: colors.softGray, fontSize: 12, marginBottom: 8 },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  gpsText: { color: colors.darkBlue, fontSize: 12, fontWeight: '600' },
  map: { height: 200, borderRadius: radius.md, overflow: 'hidden' },
});
