import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
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

export async function POST(request) {
  try {
    // Check authentication
    const sessionId = request.cookies.get('session')?.value
    if (!sessionId || !sessions.has(sessionId)) {
      return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const user = sessions.get(sessionId)
    if (user.role !== 'admin') {
      return handleCORS(NextResponse.json({ error: 'Admin access required' }, { status: 403 }))
    }

    const formData = await request.formData()
    const files = formData.getAll('files')

    if (!files || files.length === 0) {
      return handleCORS(NextResponse.json({ error: 'No files provided' }, { status: 400 }))
    }

    const db = await connectToMongo()
    
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
  } catch (error) {
    console.error('Upload API error:', error)
    return handleCORS(NextResponse.json({ error: 'Server error' }, { status: 500 }))
  }
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}