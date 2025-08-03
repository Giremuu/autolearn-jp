import { NextResponse } from 'next/server'
import { sessions } from '../login/route'

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function GET(request) {
  const sessionId = request.cookies.get('session')?.value
  if (sessionId && sessions.has(sessionId)) {
    return handleCORS(NextResponse.json(sessions.get(sessionId)))
  }
  return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}