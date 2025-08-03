import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// Session storage (in production, use Redis or database)
const sessions = new Map()

// Default users
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'autolearn2024',
  role: 'admin'
}

const GUEST_USER = {
  username: 'guest',
  password: 'guest',
  role: 'guest'
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { username, password } = body

    let user = null
    if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
      user = { ...DEFAULT_ADMIN }
      delete user.password
    } else if (username === GUEST_USER.username && password === GUEST_USER.password) {
      user = { ...GUEST_USER }
      delete user.password
    }

    if (user) {
      const sessionId = uuidv4()
      sessions.set(sessionId, user)
      
      const response = NextResponse.json(user)
      response.cookies.set('session', sessionId, { 
        httpOnly: true, 
        secure: false, 
        maxAge: 86400 
      })
      return handleCORS(response)
    }

    return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }))
  } catch (error) {
    return handleCORS(NextResponse.json({ error: 'Server error' }, { status: 500 }))
  }
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Export sessions for other routes
export { sessions }