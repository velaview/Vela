export interface LocationData {
  country: string;
  countryCode: string;
  city: string;
  timezone: string;
  lat: number;
  lon: number;
}

export async function getLocationFromIp(ip: string): Promise<LocationData | null> {
  // Use a mock for localhost
  if (ip === '127.0.0.1' || ip === '::1') {
    return {
      country: 'United States',
      countryCode: 'US',
      city: 'Localhost',
      timezone: 'America/New_York',
      lat: 40.7128,
      lon: -74.0060,
    };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();

    if (data.status === 'fail') {
      return null;
    }

    return {
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      timezone: data.timezone,
      lat: data.lat,
      lon: data.lon,
    };
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return null;
  }
}
