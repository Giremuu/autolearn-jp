import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

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

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Session storage (in production, use Redis or database)
const sessions = new Map()

// Default admin user (in production, use proper password hashing)
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'autolearn2024', // Change this!
  role: 'admin'
}

const GUEST_USER = {
  username: 'guest',
  password: 'guest',
  role: 'guest'
}

// Parse markdown file content
function parseMarkdownWord(content, filename) {
  try {
    const lines = content.split('\n')
    let word = {
      id: uuidv4(),
      filename: filename,
      createdAt: new Date()
    }

    // Extract title and kanji
    const titleMatch = content.match(/##\s*🈶\s*Kanji\s*[:：]\s*([^-]+)\s*-\s*(.+)/)
    if (titleMatch) {
      word.kanji = titleMatch[1].trim()
      word.traductionFr = titleMatch[2].trim()
    }

    // Extract metadata using regex
    const extractField = (pattern) => {
      const match = content.match(pattern)
      return match ? match[1].trim() : null
    }

    // Extract readings and translations
    word.onyomi = extractField(/Lecture\s+\*onyomi\*\s*[:：]\s*([^(\n]+)/)
    word.kunyomi = extractField(/Lecture\s+\*kunyomi\*\s*[:：]\s*([^(\n]+)/)
    word.traductionEn = extractField(/Traduction\s+EN\s*[:：]\s*(.+)/)

    // Extract type (remove # symbol)
    const typeMatch = extractField(/Type\s*[:：]\s*#?(\w+)/)
    if (typeMatch) {
      word.type = typeMatch.replace('#', '')
    }

    // Extract theme (remove # symbol)
    const themeMatch = extractField(/Thème\s*[:：]\s*#?(\w+)/)
    if (themeMatch) {
      word.theme = themeMatch.replace('#', '')
    }

    // Extract tags
    const tagsMatch = content.match(/Tags\s*[:：]\s*(.+)/)
    if (tagsMatch) {
      word.tags = tagsMatch[1].split('#').filter(tag => tag.trim()).map(tag => tag.trim())
    }

    return word
  } catch (error) {
    console.error('Error parsing markdown:', error)
    return null
  }
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "AutoLearn JP API" }))
    }

    // Authentication endpoints
    if (route === '/auth/login' && method === 'POST') {
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
    }

    if (route === '/auth/check' && method === 'GET') {
      const sessionId = request.cookies.get('session')?.value
      if (sessionId && sessions.has(sessionId)) {
        return handleCORS(NextResponse.json(sessions.get(sessionId)))
      }
      return handleCORS(NextResponse.json({ error: 'Not authenticated' }, { status: 401 }))
    }

    if (route === '/auth/logout' && method === 'POST') {
      const sessionId = request.cookies.get('session')?.value
      if (sessionId) {
        sessions.delete(sessionId)
      }
      const response = NextResponse.json({ success: true })
      response.cookies.delete('session')
      return handleCORS(response)
    }

    // Check authentication for protected routes
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId || !sessions.has(sessionId)) {
      return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const user = sessions.get(sessionId)

    // Words endpoints
    if (route === '/words' && method === 'GET') {
      const words = await db.collection('words')
        .find({})
        .sort({ createdAt: -1 })
        .toArray()

      const cleanedWords = words.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json(cleanedWords))
    }

    // Upload endpoint - Admin only
    if (route === '/upload' && method === 'POST') {
      if (user.role !== 'admin') {
        return handleCORS(NextResponse.json({ error: 'Admin access required' }, { status: 403 }))
      }

      const formData = await request.formData()
      const files = formData.getAll('files')

      if (!files || files.length === 0) {
        return handleCORS(NextResponse.json({ error: 'No files provided' }, { status: 400 }))
      }

      // Clear existing words
      await db.collection('words').deleteMany({})

      let processed = 0
      const errors = []

      for (const file of files) {
        if (!file.name.endsWith('.md')) continue

        try {
          const content = await file.text()
          const word = parseMarkdownWord(content, file.name)
          
          if (word && word.kanji) {
            await db.collection('words').insertOne(word)
            processed++
          } else {
            errors.push(`Failed to parse ${file.name}`)
          }
        } catch (error) {
          errors.push(`Error processing ${file.name}: ${error.message}`)
        }
      }

      return handleCORS(NextResponse.json({ 
        processed, 
        errors: errors.length > 0 ? errors : undefined 
      }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute