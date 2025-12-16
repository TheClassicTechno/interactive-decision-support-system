import { NextRequest, NextResponse } from 'next/server';

// Determine backend API URL
// On Vercel, use the serverless function route
// Locally, use the FastAPI server or env var
function getBackendUrl(): string {
  // Check for explicit env var first
  if (process.env.IDSS_API_URL) {
    return process.env.IDSS_API_URL;
  }
  
  // On Vercel, use the serverless function route
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/backend-api`;
  }
  
  // Local development - use FastAPI server
  return 'http://localhost:8000';
}

const IDSS_API_URL = getBackendUrl();

export async function POST(request: NextRequest) {
  try {
    // Check if request has content
    const contentLength = request.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message field is required' },
        { status: 400 }
      );
    }
    
    console.log('Attempting to connect to IDSS agent at:', IDSS_API_URL);
    
    const response = await fetch(`${IDSS_API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`IDSS API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { 
          error: `IDSS Agent API Error: ${response.status}`,
          details: errorText,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully received response from IDSS agent');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error connecting to IDSS agent:', error);
    
    let errorMessage = 'Failed to connect to agent';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Agent server is not running or not accessible';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Agent server hostname not found';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Agent request timed out';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        troubleshooting: {
          checkServer: 'Ensure the agent server is running on port 8000',
          checkEnv: 'Verify IDSS_API_URL environment variable',
          checkNetwork: 'Check network connectivity and firewall settings'
        }
      },
      { status: 500 }
    );
  }
}
