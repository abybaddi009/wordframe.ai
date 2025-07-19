import { create } from 'zustand'
import { GoogleGenAI } from '@google/genai'
import { generate } from 'random-words'

export interface WordWithHint {
  word: string
  hint: string
}

interface GeminiStore {
  // State
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  genAI: GoogleGenAI | null
  
  // Actions
  actions: {
    initializeGemini: (apiKey: string) => Promise<void>
    generateWords: (count: number, theme?: string) => Promise<WordWithHint[]>
    generateWordsOfLength: (count: number, length: number) => Promise<WordWithHint[]>
    generateWordsFromBase: (baseWords: string[], count: number) => Promise<WordWithHint[]>
    generateHintsForWords: (words: string[]) => Promise<WordWithHint[]>
    clearError: () => void
  }
}

export const useGeminiStore = create<GeminiStore>((set, get) => ({
  // Initial state
  isInitialized: false,
  isLoading: false,
  error: null,
  genAI: null,

  // Initialize Gemini with API key
  actions: {
    initializeGemini: async (apiKey: string) => {
    try {
      set({ isLoading: true, error: null })
      
      const genAI = new GoogleGenAI({ apiKey })
      
      set({ 
        genAI, 
        isInitialized: true, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize Gemini',
        isLoading: false 
      })
    }
  },

  // Generate n words with hints for word search using random-words
  generateWords: async (count: number, _?: string) => {
    
    try {
      set({ isLoading: true, error: null })
      
      // Generate random words with appropriate length for word search
      const randomWords = generate({ 
        exactly: count, 
        minLength: 3, 
        maxLength: 12 
      }) as string[]
      
      // Get hints for the generated words
      // const wordsWithHints = await actions.generateHintsForWords(randomWords)
      
      set({ isLoading: false })
      return randomWords.map(word => ({ word: word.toUpperCase(), hint: '' }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate words'
      set({ error: errorMessage, isLoading: false })
      throw new Error(errorMessage)
    }
  },

  // Generate n words of specific length using random-words
  generateWordsOfLength: async (count: number, length: number) => {
    try {
      set({ isLoading: true, error: null })
      
      // Generate words of specific length, with some flexibility for better results
      const minLength = Math.max(3, length - 1); // At least 3, but allow 1 shorter
      const maxLength = length + 1; // Allow 1 longer
      
      // Generate more words than needed to filter to exact length
      const randomWords = generate({ 
        exactly: count * 3, // Generate 3x to have good selection
        minLength, 
        maxLength 
      }) as string[]
      
      // Filter to exact length and take only what we need
      const exactLengthWords = randomWords
        .filter(word => word.length === length)
        .slice(0, count);
      
      // If we don't have enough exact length words, pad with close lengths
      if (exactLengthWords.length < count) {
        const closeWords = randomWords
          .filter(word => word.length >= minLength && word.length <= maxLength)
          .filter(word => !exactLengthWords.includes(word))
          .slice(0, count - exactLengthWords.length);
        
        exactLengthWords.push(...closeWords);
      }
      
      set({ isLoading: false })
      return exactLengthWords.map(word => ({ 
        word: word.toUpperCase(), 
        hint: `${word.length}-letter word` 
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate words of specific length'
      set({ error: errorMessage, isLoading: false })
      throw new Error(errorMessage)
    }
  },

  // Generate hints for provided words using Gemini
  generateHintsForWords: async (words: string[]) => {
    const { genAI, isInitialized } = get()
    
    if (!isInitialized || !genAI) {
      throw new Error('Gemini not initialized. Call initializeGemini first.')
    }

    try {
      const wordsText = words.join(', ')
      const prompt = `For each of the following words, provide a helpful hint that gives clues about the word without being too obvious. The hints should be appropriate for all ages and suitable for a word search puzzle.

Words: ${wordsText}

Format your response as a JSON array with objects containing "word" and "hint" fields:
[
  {"word": "EXAMPLE", "hint": "A sample or illustration"},
  {"word": "ANOTHER", "hint": "One more or different"}
]

Make sure each hint:
- Gives useful clues without being too direct
- Is appropriate for all ages
- Helps players identify the word in a word search context`

      const response = await genAI.models.generateContent({
        model: "gemma-3-12b-it",
        contents: prompt,
      })
      
      const text = response.text
      if (!text) {
        throw new Error('No text response from Gemini')
      }
      
      // Parse the JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
      const wordsWithHints: WordWithHint[] = JSON.parse(cleanedText)
      
      // Validate the response
      if (!Array.isArray(wordsWithHints) || wordsWithHints.length !== words.length) {
        throw new Error('Invalid response format from Gemini')
      }
      
      // Ensure all words are uppercase for word search
      const processedWords = wordsWithHints.map(item => ({
        word: item.word.toUpperCase(),
        hint: item.hint
      }))
      
      return processedWords
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate hints'
      throw new Error(errorMessage)
    }
  },

  // Generate words with hints based on provided base words (still uses Gemini for thematic generation)
  generateWordsFromBase: async (baseWords: string[], count: number) => {
    const { genAI, isInitialized } = get()
    
    if (!isInitialized || !genAI) {
      throw new Error('Gemini not initialized. Call initializeGemini first.')
    }

    try {
      set({ isLoading: true, error: null })
      
      const baseWordsText = baseWords.join(', ')
      const prompt = `Based on these seed words: ${baseWordsText}

Generate exactly ${count} words that are thematically related to or inspired by the seed words. Each word should be between 4-12 letters long and suitable for a word search puzzle.

For each word, provide a helpful hint that gives clues about the word without being too obvious.

Format your response as a JSON array with objects containing "word" and "hint" fields:
[
  {"word": "EXAMPLE", "hint": "A sample or illustration"},
  {"word": "ANOTHER", "hint": "One more or different"}
]

Make sure the generated words:
- Are related to the theme/topic of the seed words
- Vary in length and difficulty
- Are appropriate for all ages
- Include a mix of nouns, verbs, adjectives, and proper nouns`

      const response = await genAI.models.generateContent({
        model: "gemma-3-12b-it",
        contents: prompt,
      })
      
      const text = response.text
      if (!text) {
        throw new Error('No text response from Gemini')
      }
      
      // Parse the JSON response
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
      const wordsWithHints: WordWithHint[] = JSON.parse(cleanedText)
      
      // Validate the response
      if (!Array.isArray(wordsWithHints) || wordsWithHints.length !== count) {
        throw new Error('Invalid response format from Gemini')
      }
      
      // Ensure all words are uppercase for word search
      const processedWords = wordsWithHints.map(item => ({
        word: item.word.toUpperCase(),
        hint: item.hint
      }))
      
      set({ isLoading: false })
      return processedWords
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate words from base words'
      set({ error: errorMessage, isLoading: false })
      throw new Error(errorMessage)
    }
  },

  // Clear any errors
  clearError: () => set({ error: null })
},
}))
