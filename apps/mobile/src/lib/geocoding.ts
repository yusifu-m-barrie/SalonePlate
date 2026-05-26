import * as Location from 'expo-location';

export interface ResolvedAddress {
  street: string;
  city: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedAddress | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const place = results[0];
    if (!place) return null;

    const streetParts = [place.streetNumber, place.street].filter(Boolean);
    const street =
      streetParts.join(' ').trim() ||
      place.name?.trim() ||
      place.district?.trim() ||
      place.subregion?.trim() ||
      '';

    const city = place.city?.trim() || place.subregion?.trim() || place.region?.trim() || '';

    if (!street && !city) return null;
    return { street: street || city, city: city || street };
  } catch {
    return null;
  }
}
