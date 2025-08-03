'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Upload, Search, BookOpen, Brain, Filter, FileText, LogOut } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [words, setWords] = useState([])
  const [filteredWords, setFilteredWords] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [themeFilter, setThemeFilter] = useState('tous')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')

  // Demo data for presentation
  const demoWords = [
    {
      id: 1,
      kanji: '火',
      traductionFr: 'Feu / Flamme',
      traductionEn: 'Fire / Flame',
      kunyomi: 'ひ (hi), ほ (ho)',
      onyomi: 'カ (ka)',
      type: 'nom',
      theme: 'environnement'
    },
    {
      id: 2,
      kanji: '水',
      traductionFr: 'Eau',
      traductionEn: 'Water',
      kunyomi: 'みず (mizu)',
      onyomi: 'スイ (sui)',
      type: 'nom',
      theme: 'environnement'
    },
    {
      id: 3,
      kanji: '食べる',
      traductionFr: 'Manger',
      traductionEn: 'To eat',
      kunyomi: 'たべる (taberu)',
      onyomi: 'ショク (shoku)',
      type: 'verbe',
      theme: 'nourriture'
    }
  ]

  // Check authentication on load
  useEffect(() => {
    // Demo mode - simulate admin login
    setUser({ username: 'admin', role: 'admin' })
    setIsAuthenticated(true)
    setWords(demoWords)
  }, [])

  // Filter words based on search and filters
  useEffect(() => {
    let filtered = words
    
    if (searchTerm) {
      filtered = filtered.filter(word => 
        word.kanji?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.traductionFr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.kunyomi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.onyomi?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (typeFilter !== 'tous') {
      filtered = filtered.filter(word => word.type === typeFilter)
    }
    
    if (themeFilter !== 'tous') {
      filtered = filtered.filter(word => word.theme === themeFilter)
    }
    
    setFilteredWords(filtered)
  }, [words, searchTerm, typeFilter, themeFilter])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
        loadWords()
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
        loadWords()
      } else {
        alert('Identifiants incorrects')
      }
    } catch (error) {
      alert('Erreur de connexion')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setIsAuthenticated(false)
      setUser(null)
      setWords([])
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  const loadWords = async () => {
    try {
      const response = await fetch('/api/words')
      if (response.ok) {
        const wordsData = await response.json()
        setWords(wordsData)
      }
    } catch (error) {
      console.error('Erreur chargement mots:', error)
    }
  }

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    setIsUploading(true)
    setUploadMessage('')

    try {
      const formData = new FormData()
      files.forEach(file => {
        if (file.name.endsWith('.md')) {
          formData.append('files', file)
        }
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setUploadMessage(`${result.processed} mots importés avec succès !`)
        loadWords()
      } else {
        const error = await response.json()
        setUploadMessage(`Erreur: ${error.error}`)
      }
    } catch (error) {
      setUploadMessage('Erreur lors de l\'upload')
    }

    setIsUploading(false)
  }

  const getUniqueTypes = () => {
    const types = [...new Set(words.map(w => w.type).filter(Boolean))]
    return types.sort()
  }

  const getUniqueThemes = () => {
    const themes = [...new Set(words.map(w => w.theme).filter(Boolean))]
    return themes.sort()
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">🈶 AutoLearn JP</CardTitle>
            <CardDescription>
              Connectez-vous pour accéder à vos mots japonais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                placeholder="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" className="w-full">
                Se connecter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              🈶 AutoLearn JP
            </h1>
            <p className="text-muted-foreground">
              Bonjour {user?.username} ({user?.role === 'admin' ? 'Administrateur' : 'Invité'})
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        <Tabs defaultValue="vocabulary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vocabulary">
              <BookOpen className="w-4 h-4 mr-2" />
              Vocabulaire
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <Brain className="w-4 h-4 mr-2" />
              Quiz
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="import">
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </TabsTrigger>
            )}
          </TabsList>

          {/* Vocabulary Tab */}
          <TabsContent value="vocabulary" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un mot..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  {getUniqueTypes().map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={themeFilter} onValueChange={setThemeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Thème" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les thèmes</SelectItem>
                  {getUniqueThemes().map(theme => (
                    <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWords.map((word) => (
                <Card key={word.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">
                      {word.kanji}
                    </CardTitle>
                    <CardDescription className="text-center">
                      {word.traductionFr}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {word.kunyomi && (
                      <div className="text-sm">
                        <span className="font-semibold">Kunyomi:</span> {word.kunyomi}
                      </div>
                    )}
                    {word.onyomi && (
                      <div className="text-sm">
                        <span className="font-semibold">Onyomi:</span> {word.onyomi}
                      </div>
                    )}
                    {word.traductionEn && (
                      <div className="text-sm">
                        <span className="font-semibold">EN:</span> {word.traductionEn}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {word.type && (
                        <Badge variant="secondary">{word.type}</Badge>
                      )}
                      {word.theme && (
                        <Badge variant="outline">{word.theme}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredWords.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Aucun mot trouvé</h3>
                <p className="text-muted-foreground">
                  {words.length === 0 
                    ? "Importez vos premiers fichiers .md pour commencer"
                    : "Essayez de modifier vos critères de recherche"
                  }
                </p>
              </div>
            )}
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz">
            <Card>
              <CardHeader>
                <CardTitle>Quiz - Bientôt disponible</CardTitle>
                <CardDescription>
                  Testez vos connaissances avec différents types de quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Les quiz seront disponibles une fois que vous aurez importé du vocabulaire.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import Tab - Admin only */}
          {user?.role === 'admin' && (
            <TabsContent value="import" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Importer des fichiers Obsidian</CardTitle>
                  <CardDescription>
                    Sélectionnez vos fichiers .md exportés d'Obsidian
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-6">
                    <input
                      type="file"
                      multiple
                      accept=".md"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Sélectionnez plusieurs fichiers .md à la fois
                    </p>
                  </div>

                  {isUploading && (
                    <Alert>
                      <AlertDescription>
                        Import en cours... Veuillez patienter.
                      </AlertDescription>
                    </Alert>
                  )}

                  {uploadMessage && (
                    <Alert>
                      <AlertDescription>
                        {uploadMessage}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}