import { NextResponse } from 'next/server'

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function GET() {
  console.log('DEBUG: Root API route called')
  return handleCORS(NextResponse.json({ message: "AutoLearn JP API" }))
}

export async function OPTIONS() {
  console.log('DEBUG: Root API OPTIONS called')
  return handleCORS(new NextResponse(null, { status: 200 }))
}