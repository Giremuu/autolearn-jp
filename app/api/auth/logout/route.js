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

export async function POST(request) {
  const sessionId = request.cookies.get('session')?.value
  if (sessionId) {
    sessions.delete(sessionId)
  }
  const response = NextResponse.json({ success: true })
  response.cookies.delete('session')
  return handleCORS(response)
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}