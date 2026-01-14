import { NextRequest, NextResponse } from 'next/server';
import { getLocationFromIp } from '@/lib/utils/geolocation';

export async function GET(request: NextRequest) {
  try {
    // Get IP from headers or fallback
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : '127.0.0.1';

    const location = await getLocationFromIp(ip);

    return NextResponse.json(location || {});
  } catch (error) {
    console.error('Failed to get location:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
