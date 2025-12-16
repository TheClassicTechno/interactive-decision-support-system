import { NextRequest, NextResponse } from 'next/server';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from parent directory
config({ path: path.resolve(process.cwd(), '../.env') });

const AUTODEV_API_KEY = process.env.AUTODEV_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vin = searchParams.get('vin');

  if (!vin) {
    return NextResponse.json({ error: 'VIN parameter is required' }, { status: 400 });
  }

  if (!AUTODEV_API_KEY) {
    console.warn('AUTODEV_API_KEY not found, returning placeholder');
    return NextResponse.json({ 
      images: [], 
      error: 'Vehicle image service not configured' 
    });
  }

  try {
    const response = await fetch(`https://api.auto.dev/photos/${vin}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTODEV_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          images: [], 
          message: 'No photos available for this VIN' 
        });
      }
      throw new Error(`Auto.dev API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract image URLs from the response, filtering out SVGs
    const allImages = data.retail || [];
    const validImages = allImages.filter((img: string) => {
      // Filter out SVG images and ensure we have valid image URLs
      return img && 
             typeof img === 'string' && 
             !img.toLowerCase().includes('.svg') &&
             (img.toLowerCase().includes('.jpg') || 
              img.toLowerCase().includes('.jpeg') || 
              img.toLowerCase().includes('.png') || 
              img.toLowerCase().includes('.webp'));
    });
    
    return NextResponse.json({ 
      images: validImages.slice(0, 5), // Return first 5 valid images
      count: validImages.length,
      totalFound: allImages.length
    });

  } catch (error) {
    console.error('Error fetching vehicle photos:', error);
    return NextResponse.json({ 
      images: [], 
      error: 'Failed to fetch vehicle photos' 
    });
  }
}
