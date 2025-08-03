import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { sessions } from '../auth/login/route'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function GET(request) {
  try {
    // Check authentication
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId || !sessions.has(sessionId)) {
      return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const db = await connectToMongo()
    const words = await db.collection('words')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    const cleanedWords = words.map(({ _id, ...rest }) => rest)
    return handleCORS(NextResponse.json(cleanedWords))
  } catch (error) {
    console.error('Words API error:', error)
    return handleCORS(NextResponse.json({ error: 'Server error' }, { status: 500 }))
  }
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}