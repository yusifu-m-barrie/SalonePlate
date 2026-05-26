import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/** Default centre of Makeni when device location is unavailable. */
export const MAKENI_CENTER = { lat: 8.8864, lng: -12.0442 };

export function useCustomerLocation() {
  const [coords, setCoords] = useState(MAKENI_CENTER);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setReady(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setUsingDeviceLocation(true);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { lat: coords.lat, lng: coords.lng, usingDeviceLocation, ready };
}
