import { NextRequest, NextResponse } from 'next/server';

// Determine backend API URL
function getBackendUrl(): string {
  if (process.env.IDSS_API_URL) {
    return process.env.IDSS_API_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/backend-api`;
  }
  return 'http://localhost:8000';
}

const IDSS_API_URL = getBackendUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const queryString = url.search;
    
    const response = await fetch(`${IDSS_API_URL}/session/${path}${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `IDSS Agent API Error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Error proxying session request:', error);
    return NextResponse.json(
      { error: 'Failed to connect to agent', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const body = await request.json();
    
    const response = await fetch(`${IDSS_API_URL}/session/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `IDSS Agent API Error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Error proxying session request:', error);
    return NextResponse.json(
      { error: 'Failed to connect to agent', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    
    const response = await fetch(`${IDSS_API_URL}/session/${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `IDSS Agent API Error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Error proxying session request:', error);
    return NextResponse.json(
      { error: 'Failed to connect to agent', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
