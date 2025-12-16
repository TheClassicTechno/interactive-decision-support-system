import { NextRequest } from 'next/server';

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
    const body = await request.json();
    
    // Validate required fields
    if (!body.message) {
      return new Response('Message field is required', { status: 400 });
    }
    
    console.log('Connecting to IDSS streaming endpoint at:', `${IDSS_API_URL}/chat/stream`);
    
    // Forward the request to the IDSS streaming endpoint
    const response = await fetch(`${IDSS_API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`IDSS API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: `IDSS Agent API Error: ${response.status}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the streaming response (pass through SSE)
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
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
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

