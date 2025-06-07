import { create } from 'zustand';
import { useGeminiStore, type WordWithHint } from './gemini';

export interface WordSearchWord extends WordWithHint {
  placed: boolean;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up';
}

interface GridCell {
  letter: string;
  isWordLetter: boolean;
  wordIds: number[];
}

interface WordSearchState {
  // Configuration
  charactersPerMm: number;
  gridWidth: number;
  gridHeight: number;
  
  // Words and puzzle data
  words: WordSearchWord[];
  grid: GridCell[][];
  availablePositions: boolean[][];
  
  // UI state
  isGenerating: boolean;
  generationStep: string;
  error: string | null;
  
  // Paper dimensions (in mm)
  paperWidth: number;
  paperHeight: number;
}

interface WordSearchActions {
  setCharactersPerMm: (value: number) => void;
  setPaperDimensions: (width: number, height: number) => void;
  setWords: (words: WordWithHint[]) => void;
  addWord: (word: WordWithHint) => void;
  removeWord: (index: number) => void;
  generatePuzzle: (thresholdImage: string) => Promise<void>;
  shuffleWords: () => void;
  reset: () => void;
  clearError: () => void;
}

interface WordSearchStore extends WordSearchState {
  actions: WordSearchActions;
}

const initialState: WordSearchState = {
  charactersPerMm: 2.5,
  gridWidth: 0,
  gridHeight: 0,
  words: [],
  grid: [],
  availablePositions: [],
  isGenerating: false,
  generationStep: '',
  error: null,
  paperWidth: 210, // A4 width in mm
  paperHeight: 297, // A4 height in mm
};

export const useWordSearchStore = create<WordSearchStore>((set, get) => ({
  ...initialState,
  
  actions: {
    setCharactersPerMm: (value: number) => {
      console.log('📏 Setting characters per mm:', value);
      set({ charactersPerMm: value });
    },
    
    setPaperDimensions: (width: number, height: number) => {
      console.log('📄 Setting paper dimensions:', { width, height });
      const { charactersPerMm } = get();
      const gridWidth = Math.floor(width / charactersPerMm);
      const gridHeight = Math.floor(height / charactersPerMm);
      
      console.log('🎯 Calculated grid size:', { gridWidth, gridHeight });
      
      set({ 
        paperWidth: width, 
        paperHeight: height,
        gridWidth,
        gridHeight
      });
    },
    
    setWords: (words: WordWithHint[]) => {
      console.log('📝 Setting words:', words.length);
      const wordSearchWords: WordSearchWord[] = words.map(word => ({
        ...word,
        placed: false,
        startRow: 0,
        startCol: 0,
        direction: 'horizontal' as const
      }));
      set({ words: wordSearchWords });
    },
    
    addWord: (word: WordWithHint) => {
      console.log('➕ Adding word:', word.word);
      const newWord: WordSearchWord = {
        ...word,
        placed: false,
        startRow: 0,
        startCol: 0,
        direction: 'horizontal'
      };
      set(state => ({ words: [...state.words, newWord] }));
    },
    
    removeWord: (index: number) => {
      console.log('➖ Removing word at index:', index);
      set(state => ({
        words: state.words.filter((_, i) => i !== index)
      }));
    },
    
    generatePuzzle: async (thresholdImage: string) => {
      const { gridWidth, gridHeight, words, paperWidth, paperHeight } = get();
      
      console.log('🎮 Starting puzzle generation...');
      console.log('📊 Grid dimensions:', { gridWidth, gridHeight });
      console.log('📝 Word count:', words.length);
      
      if (gridWidth === 0 || gridHeight === 0) {
        console.log('❌ Grid dimensions not set');
        set({ error: 'Grid dimensions not set. Please set paper dimensions first.' });
        return;
      }
      
      set({ isGenerating: true, error: null, generationStep: 'Creating empty grid...' });
      
      try {
        // Step 1: Create empty grid first to show structure
        console.log('🎯 Step 1: Creating empty grid...');
        const grid: GridCell[][] = Array(gridHeight).fill(null).map(() =>
          Array(gridWidth).fill(null).map(() => ({
            letter: '',
            isWordLetter: false,
            wordIds: []
          }))
        );
        
        // Update state to show empty grid
        set({ 
          grid,
          generationStep: 'Analyzing image for available positions...' 
        });
        
        // Add small delay for visualization
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Step 2: Analyze threshold image to determine available positions
        console.log('🔍 Step 2: Analyzing threshold image...');
        const availablePositions = await analyzeThresholdImage(thresholdImage, gridWidth, gridHeight);
        
        // Update state to show available positions
        set({ 
          availablePositions, 
          generationStep: 'Calculating word requirements...' 
        });
        
        // Add delay to show available positions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Calculate how many characters can fit
        const totalAvailableSpaces = availablePositions.flat().filter(Boolean).length;
        console.log('🎯 Total available character spaces:', totalAvailableSpaces);
        
        // Step 4: Determine if we need more words
        const totalWordCharacters = words.reduce((sum, word) => sum + word.word.length, 0);
        console.log('📊 Current word characters:', totalWordCharacters);
        console.log('📊 Available spaces:', totalAvailableSpaces);
        
        let finalWords = [...words];
        
        if (totalWordCharacters < totalAvailableSpaces * 0.3) { // Aim for 30% word coverage
          console.log('📈 Need more words, generating additional words...');
          set({ generationStep: 'Generating additional words...' });
          
          const geminiStore = useGeminiStore.getState();
          const additionalWordsNeeded = Math.min(10, Math.floor((totalAvailableSpaces * 0.3 - totalWordCharacters) / 6)); // Assume avg 6 chars per word
          
          if (additionalWordsNeeded > 0) {
            try {
              const newWords = await geminiStore.actions.generateWords(additionalWordsNeeded);
              finalWords = [...finalWords, ...newWords.map(word => ({
                ...word,
                placed: false,
                startRow: 0,
                startCol: 0,
                direction: 'horizontal' as const
              }))];
              console.log('✅ Generated additional words:', newWords.length);
            } catch (error) {
              console.log('⚠️ Failed to generate additional words, continuing with existing words');
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        set({ generationStep: 'Placing words in grid...' });
        
        // Step 5: Place words in the grid with visual updates
        console.log('🎯 Step 5: Placing words in grid...');
        const placedWords = await placeWordsInGridWithUpdates(grid, finalWords, availablePositions, set);
        
        set({ generationStep: 'Filling empty spaces...' });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 6: Fill remaining available spaces with random letters
        console.log('🎲 Step 6: Filling with random letters...');
        await fillEmptySpacesWithUpdates(grid, availablePositions, set);
        
        console.log('✅ Puzzle generation completed successfully');
        console.log('📊 Final stats:', {
          wordsPlaced: placedWords.filter(w => w.placed).length,
          totalWords: placedWords.length,
          gridFilled: grid.flat().filter(cell => cell.letter).length
        });
        
        set({
          words: placedWords,
          grid,
          isGenerating: false,
          generationStep: 'Complete!'
        });
        
        // Show completion message briefly
        await new Promise(resolve => setTimeout(resolve, 1000));
        set({ generationStep: '' });
        
      } catch (error) {
        console.error('❌ Error generating puzzle:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to generate puzzle',
          isGenerating: false,
          generationStep: ''
        });
      }
    },
    
    shuffleWords: () => {
      console.log('🔀 Shuffling words...');
      const { words, grid, availablePositions } = get();
      
      if (grid.length === 0 || availablePositions.length === 0) {
        console.log('❌ No grid to shuffle');
        return;
      }
      
      set({ generationStep: 'Shuffling words...' });
      
      // Reset grid
      const newGrid: GridCell[][] = Array(grid.length).fill(null).map(() =>
        Array(grid[0].length).fill(null).map(() => ({
          letter: '',
          isWordLetter: false,
          wordIds: []
        }))
      );
      
      // Reset word placement status
      const shuffledWords = words.map(word => ({
        ...word,
        placed: false,
        startRow: 0,
        startCol: 0
      }));
      
      // Re-place words
      const placedWords = placeWordsInGrid(newGrid, shuffledWords, availablePositions);
      
      // Fill empty spaces
      fillEmptySpaces(newGrid, availablePositions);
      
      console.log('✅ Words shuffled successfully');
      
      set({
        words: placedWords,
        grid: newGrid,
        generationStep: ''
      });
    },
    
    reset: () => {
      console.log('🔄 Resetting word search store');
      set(initialState);
    },
    
    clearError: () => {
      set({ error: null });
    }
  }
}));

// Helper function to analyze threshold image
async function analyzeThresholdImage(imageUrl: string, gridWidth: number, gridHeight: number): Promise<boolean[][]> {
  console.log('🔍 Analyzing threshold image for available positions...');
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        canvas.width = gridWidth;
        canvas.height = gridHeight;
        
        // Draw and scale image to grid size
        ctx.drawImage(img, 0, 0, gridWidth, gridHeight);
        
        const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
        const data = imageData.data;
        
        const availablePositions: boolean[][] = Array(gridHeight).fill(null).map(() => 
          Array(gridWidth).fill(false)
        );
        
        let availableCount = 0;
        
        // Check each pixel - white pixels (255) are available for characters
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            const index = (y * gridWidth + x) * 4;
            const red = data[index];
            
            // If pixel is white (or close to black), it's available
            if (red < 100) {
              availablePositions[y][x] = true;
              availableCount++;
            }
          }
        }
        
        console.log('✅ Image analysis complete:', {
          totalPixels: gridWidth * gridHeight,
          availableSpaces: availableCount,
          coverage: `${((availableCount / (gridWidth * gridHeight)) * 100).toFixed(1)}%`
        });
        
        resolve(availablePositions);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load threshold image'));
    img.src = imageUrl;
  });
}

// Helper function to place words in grid with visual updates
async function placeWordsInGridWithUpdates(
  grid: GridCell[][],
  words: WordSearchWord[],
  availablePositions: boolean[][],
  set: any
): Promise<WordSearchWord[]> {
  console.log('🎯 Placing words in grid with visual updates...');
  
  const directions = ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up'] as const;
  const placedWords = [...words];
  let placedCount = 0;
  
  // Sort words by length (longest first for better placement)
  const sortedWords = [...placedWords].sort((a, b) => b.word.length - a.word.length);
  
  for (const word of sortedWords) {
    let placed = false;
    const attempts = 100; // Max attempts per word
    
    for (let attempt = 0; attempt < attempts && !placed; attempt++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const position = findValidPosition(word.word, direction, grid, availablePositions);
      
      if (position) {
        placeWordInGrid(word, position, direction, grid);
        word.placed = true;
        word.startRow = position.row;
        word.startCol = position.col;
        word.direction = direction;
        placed = true;
        placedCount++;
        
        console.log(`✅ Placed "${word.word}" at (${position.row}, ${position.col}) ${direction}`);
        
        // Update the grid state to show the new word
        set((state: any) => ({
          ...state,
          grid: [...grid.map(row => [...row])], // Create deep copy
          words: [...placedWords],
          generationStep: `Placing words... (${placedCount}/${words.length})`
        }));
        
        // Small delay to show each word placement
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (!placed) {
      console.log(`❌ Failed to place word: ${word.word}`);
    }
  }
  
  console.log(`📊 Placed ${placedCount}/${words.length} words`);
  return placedWords;
}

// Helper function to fill empty spaces with visual updates
async function fillEmptySpacesWithUpdates(grid: GridCell[][], availablePositions: boolean[][], set: any): Promise<void> {
  console.log('🎲 Filling empty spaces with random letters...');
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let filledCount = 0;
  const totalToFill = availablePositions.flat().filter((pos, i) => pos && !grid.flat()[i]?.letter).length;
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (!grid[row][col].letter) {
        grid[row][col].letter = letters[Math.floor(Math.random() * letters.length)];
        filledCount++;
        
        // Update state every few letters for visual effect
        if (filledCount % 100 === 0 || filledCount === totalToFill) {
          set((state: any) => ({
            ...state,
            grid: [...grid.map(row => [...row])],
            generationStep: `Filling spaces... (${filledCount}/${totalToFill})`
          }));
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  }
  
  console.log(`✅ Filled ${filledCount} empty spaces with random letters`);
}

// Helper function to place words in grid
function placeWordsInGrid(
  grid: GridCell[][],
  words: WordSearchWord[],
  availablePositions: boolean[][]
): WordSearchWord[] {
  console.log('🎯 Placing words in grid...');
  
  const directions = ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up'] as const;
  const placedWords = [...words];
  let placedCount = 0;
  
  // Sort words by length (longest first for better placement)
  const sortedWords = [...placedWords].sort((a, b) => b.word.length - a.word.length);
  
  for (const word of sortedWords) {
    let placed = false;
    const attempts = 100; // Max attempts per word
    
    for (let attempt = 0; attempt < attempts && !placed; attempt++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const position = findValidPosition(word.word, direction, grid, availablePositions);
      
      if (position) {
        placeWordInGrid(word, position, direction, grid);
        word.placed = true;
        word.startRow = position.row;
        word.startCol = position.col;
        word.direction = direction;
        placed = true;
        placedCount++;
        
        console.log(`✅ Placed "${word.word}" at (${position.row}, ${position.col}) ${direction}`);
      }
    }
    
    if (!placed) {
      console.log(`❌ Failed to place word: ${word.word}`);
    }
  }
  
  console.log(`📊 Placed ${placedCount}/${words.length} words`);
  return placedWords;
}

// Helper function to find valid position for a word
function findValidPosition(
  word: string,
  direction: WordSearchWord['direction'],
  grid: GridCell[][],
  availablePositions: boolean[][]
): { row: number; col: number } | null {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  const wordLength = word.length;
  
  const attempts = 50;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let row = Math.floor(Math.random() * gridHeight);
    let col = Math.floor(Math.random() * gridWidth);
    
    if (canPlaceWord(word, row, col, direction, grid, availablePositions)) {
      return { row, col };
    }
  }
  
  return null;
}

// Helper function to check if word can be placed at position
function canPlaceWord(
  word: string,
  startRow: number,
  startCol: number,
  direction: WordSearchWord['direction'],
  grid: GridCell[][],
  availablePositions: boolean[][]
): boolean {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  for (let i = 0; i < word.length; i++) {
    let row = startRow;
    let col = startCol;
    
    switch (direction) {
      case 'horizontal':
        col += i;
        break;
      case 'vertical':
        row += i;
        break;
      case 'diagonal-down':
        row += i;
        col += i;
        break;
      case 'diagonal-up':
        row -= i;
        col += i;
        break;
    }
    
    // Check bounds
    if (row < 0 || row >= gridHeight || col < 0 || col >= gridWidth) {
      return false;
    }
    
    // Check if position is available in threshold image
    if (!availablePositions[row][col]) {
      return false;
    }
    
    // Check if position is already occupied by a different letter
    if (grid[row][col].letter && grid[row][col].letter !== word[i]) {
      return false;
    }
  }
  
  return true;
}

// Helper function to place word in grid
function placeWordInGrid(
  word: WordSearchWord,
  position: { row: number; col: number },
  direction: WordSearchWord['direction'],
  grid: GridCell[][]
): void {
  for (let i = 0; i < word.word.length; i++) {
    let row = position.row;
    let col = position.col;
    
    switch (direction) {
      case 'horizontal':
        col += i;
        break;
      case 'vertical':
        row += i;
        break;
      case 'diagonal-down':
        row += i;
        col += i;
        break;
      case 'diagonal-up':
        row -= i;
        col += i;
        break;
    }
    
    grid[row][col].letter = word.word[i];
    grid[row][col].isWordLetter = true;
  }
}

// Helper function to fill empty spaces with random letters
function fillEmptySpaces(grid: GridCell[][], availablePositions: boolean[][]): void {
  console.log('🎲 Filling empty spaces with random letters...');
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let filledCount = 0;
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (!availablePositions[row][col]) {
        grid[row][col].letter = letters[Math.floor(Math.random() * letters.length)];
        filledCount++;
      }
    }
  }
  
  console.log(`✅ Filled ${filledCount} empty spaces with random letters`);
} 