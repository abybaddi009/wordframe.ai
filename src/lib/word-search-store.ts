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
  charactersPerMm: 7,
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
      const state = get();
      
      // Calculate new grid dimensions if paper dimensions are already set
      if (state.paperWidth > 0 && state.paperHeight > 0) {
        const gridWidth = Math.floor(state.paperWidth / value);
        const gridHeight = Math.floor(state.paperHeight / value);
        
        console.log('🎯 Recalculated grid size:', { gridWidth, gridHeight });
        
        set({ 
          charactersPerMm: value,
          gridWidth,
          gridHeight
        });
      } else {
        set({ charactersPerMm: value });
      }
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
        let grid: GridCell[][] = Array(gridHeight).fill(null).map(() =>
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
        const {availablePositions, grid: analyzedGrid} = await analyzeThresholdImage(thresholdImage, gridWidth, gridHeight);

        grid = analyzedGrid;
        set({ grid: [...grid.map(row => [...row])] });
        
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
        
        // Step 4: Place words using the new algorithm with on-demand word generation
        let allWords: WordSearchWord[] = [...words];
        console.log('🎯 Step 4: Placing words with on-demand generation...');
        set({ generationStep: 'Placing words and generating new ones as needed...' });
        allWords = await newPlacementAlgorithmWithUpdates(grid, allWords, availablePositions, set, totalAvailableSpaces);
        
        // Step 5: Fill remaining available spaces with random letters
        console.log('🎲 Step 5: Filling with random letters...');
        await fillEmptySpacesWithUpdates(grid, availablePositions, set);
        
        console.log('✅ Puzzle generation completed successfully');
        const finalPlacedWords = allWords.filter(w => w.placed);
        console.log('📊 Final stats:', {
          wordsPlaced: finalPlacedWords.length,
          totalWords: allWords.length,
          gridFilled: grid.flat().filter(cell => cell.letter).length
        });
        
        set({
          words: allWords,
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
      const words = get().words;
      const shuffledWords = [...words].sort(() => Math.random() - 0.5);
      set({ words: shuffledWords });
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
async function analyzeThresholdImage(imageUrl: string, gridWidth: number, gridHeight: number): Promise<{availablePositions: boolean[][], grid: GridCell[][]}> {
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

        const grid: GridCell[][] = Array(gridHeight).fill(null).map(() =>
          Array(gridWidth).fill(null).map(() => ({
            letter: '',
            isWordLetter: false,
            wordIds: []
          }))
        );
        
        let availableCount = 0;
        
        // Check each pixel - dark/black pixels are available for characters
        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            const index = (y * gridWidth + x) * 4;
            const red = data[index];
            
            // If pixel is dark/black (close to black), it's available
            if (red < 128) {
              availablePositions[y][x] = true;
              availableCount++;
            }
            else {
              // If pixel is light/white (close to white), it's not available
              // we fill it with a random letter
              const randomLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
              grid[y][x].letter = randomLetter;
              grid[y][x].isWordLetter = false;
              grid[y][x].wordIds = [];
            }
          }
        }
        
        console.log('✅ Image analysis complete:', {
          totalPixels: gridWidth * gridHeight,
          availableSpaces: availableCount,
          coverage: `${((availableCount / (gridWidth * gridHeight)) * 100).toFixed(1)}%`
        });
        
        resolve({availablePositions, grid});
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
  let placedCount = placedWords.filter(w => w.placed).length; // Count already placed words
  let newlyPlacedCount = 0;
  
  // Only process words that haven't been placed yet
  const unplacedWords = placedWords.filter(word => !word.placed);
  console.log(`📊 Found ${unplacedWords.length} unplaced words out of ${placedWords.length} total`);
  
  // Sort unplaced words by length (longest first for better placement)
  const sortedWords = [...unplacedWords].sort((a, b) => b.word.length - a.word.length);
  
  for (const word of sortedWords) {
    let placed = false;
    const allValidPositions: Array<{ row: number; col: number; overlap: number; direction: WordSearchWord['direction'] }> = [];
    
    // Find all valid positions for all directions
    for (const direction of directions) {
      const positions = findAllValidPositions(word.word, direction, grid, availablePositions);
      positions.forEach(pos => allValidPositions.push({ ...pos, direction }));
    }
    
    if (allValidPositions.length > 0) {
      // Sort by overlap (prefer positions with more letter overlaps, but not excessive overlaps)
      allValidPositions.sort((a, b) => {
        // Prefer some overlap but not complete overlap (which indicates overwriting)
        const aScore = Math.min(a.overlap, word.word.length - 1); // Cap overlap at word length - 1
        const bScore = Math.min(b.overlap, word.word.length - 1);
        return bScore - aScore;
      });
      
      // Filter out positions that would completely overwrite existing letters
      const validPositions = allValidPositions.filter(pos => {
        return pos.overlap < word.word.length; // Don't allow complete overlap (overwriting)
      });
      
      if (validPositions.length > 0) {
        // Pick from the best positions (those with optimal overlap)
        const bestOverlap = validPositions[0].overlap;
        const bestPositions = validPositions.filter(pos => pos.overlap === bestOverlap);
        const selectedPosition = bestPositions[Math.floor(Math.random() * bestPositions.length)];
        
        placeWordInGrid(word, selectedPosition, selectedPosition.direction, grid);
        word.placed = true;
        word.startRow = selectedPosition.row;
        word.startCol = selectedPosition.col;
        word.direction = selectedPosition.direction;
        placed = true;
        newlyPlacedCount++;
        placedCount++;
        
        console.log(`✅ Placed "${word.word}" at (${selectedPosition.row}, ${selectedPosition.col}) ${selectedPosition.direction} with ${selectedPosition.overlap} overlaps`);
        
        // Update the grid state to show the new word
        set((state: any) => ({
          ...state,
          grid: [...grid.map(row => [...row])], // Create deep copy
          words: [...placedWords],
          generationStep: `Placing words... (${placedCount}/${placedWords.length})`
        }));
        
        // Small delay to show each word placement
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (!placed) {
      console.log(`❌ Failed to place word: ${word.word}`);
    }
  }
  
  console.log(`📊 Placed ${newlyPlacedCount} new words, total placed: ${placedCount}/${placedWords.length}`);
  return placedWords;
}

// Helper function to fill all the unfilled spaces with visual updates
async function fillEmptySpacesWithUpdates(grid: GridCell[][], availablePositions: boolean[][], set: any): Promise<void> {
  console.log('🎲 Filling empty spaces with random letters...');
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let filledCount = 0;
  
  // Calculate only available positions that need filling
  const positionsToFill: {row: number, col: number}[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (availablePositions[row][col] && !grid[row][col].letter) {
        positionsToFill.push({row, col});
      }
    }
  }
  
  const totalToFill = positionsToFill.length;
  console.log(`🎯 Found ${totalToFill} available positions to fill with random letters`);
  
  for (const {row, col} of positionsToFill) {
    grid[row][col].letter = letters[Math.floor(Math.random() * letters.length)];
    filledCount++;
    
    // Update state every 50 letters or at the end for visual effect
    if (filledCount % 50 === 0 || filledCount === totalToFill) {
      set((state: any) => ({
        ...state,
        grid: [...grid.map(row => [...row])],
        generationStep: `Filling spaces... (${filledCount}/${totalToFill})`
      }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`✅ Filled ${filledCount} empty spaces with random letters`);
}

// Helper function to find all valid positions for a word (systematic approach)
function findAllValidPositions(
  word: string,
  direction: WordSearchWord['direction'],
  grid: GridCell[][],
  availablePositions: boolean[][]
): Array<{ row: number; col: number; overlap: number }> {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  const validPositions: Array<{ row: number; col: number; overlap: number }> = [];
  
  // Systematically check all possible positions
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const canPlace = canPlaceWord(word, row, col, direction, grid, availablePositions);
      if (canPlace) {
        const overlap = calculateOverlap(word, row, col, direction, grid);
        validPositions.push({ row, col, overlap });
      }
    }
  }
  
  // Sort by overlap (descending) - prefer positions with more overlaps
  return validPositions.sort((a, b) => b.overlap - a.overlap);
}

// Helper function to calculate word overlap with existing letters
function calculateOverlap(
  word: string,
  startRow: number,
  startCol: number,
  direction: WordSearchWord['direction'],
  grid: GridCell[][]
): number {
  let overlap = 0;
  
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
    
    // Count overlapping letters
    if (grid[row][col].letter && grid[row][col].letter === word[i].toUpperCase()) {
      overlap++;
    }
  }
  
  return overlap;
}

// Helper function to place word in grid with proper validation
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
    
    // Only place the letter if the position is empty OR if it matches (overlap)
    const existingLetter = grid[row][col].letter;
    if (!existingLetter || existingLetter === word.word[i].toUpperCase()) {
      grid[row][col].letter = word.word[i].toUpperCase();
      grid[row][col].isWordLetter = true;
      // Add word ID to track which words use this cell (for overlaps)
      if (!grid[row][col].wordIds.includes(word.word.length)) { // Using word length as rough ID
        grid[row][col].wordIds.push(word.word.length);
      }
    }
  }
}

// Helper function to check if word can be placed at position with proper overlap validation
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
    
    // FIXED: Check if position is already occupied by a different letter (proper overlap validation)
    const existingLetter = grid[row][col].letter;
    if (existingLetter && existingLetter !== word[i].toUpperCase()) {
      return false; // Cannot place - letters don't match
    }
  }
  
  return true;
}

async function newPlacementAlgorithmWithUpdates(
  grid: GridCell[][],
  words: WordSearchWord[],
  availablePositions: boolean[][],
  set: any,
  totalAvailableSpaces: number
): Promise<WordSearchWord[]> {
  console.log('🆕 Starting simplified placement algorithm...');
  
  let allWords = [...words];
  
  // Phase 1: Place any existing words first
  console.log('📍 Phase 1: Placing existing words...');
  allWords = await placeExistingWordsSystematically(grid, allWords, availablePositions, set);
  
  // Phase 2: Simple iterative word generation and placement
  console.log('🔤 Phase 2: Iterative word generation and placement...');
  allWords = await simpleIterativeWordPlacement(grid, allWords, availablePositions, set, totalAvailableSpaces);
  
  // Phase 3: Fill remaining spaces with random letters
  console.log('🎲 Phase 3: Filling remaining spaces with random letters...');
  await fillRemainingSpacesWithRandomLetters(grid, availablePositions, set);
  
  const finalPlacedCount = allWords.filter(w => w.placed).length;
  console.log(`✅ Simplified algorithm results: ${finalPlacedCount}/${allWords.length} words placed`);
  
  return allWords;
}

// New simplified iterative approach
async function simpleIterativeWordPlacement(
  grid: GridCell[][],
  words: WordSearchWord[],
  availablePositions: boolean[][],
  set: any,
  totalAvailableSpaces: number
): Promise<WordSearchWord[]> {
  
  const allWords = [...words];
  let currentPlacedCharacters = allWords.filter(w => w.placed).reduce((sum, w) => sum + w.word.length, 0);
  let iterationCount = 0;
  const maxIterations = 50; // Prevent infinite loops
  
  console.log(`🎯 Starting iterative placement: ${currentPlacedCharacters}/${totalAvailableSpaces} characters`);
  
  while (currentPlacedCharacters < totalAvailableSpaces * 0.85 && iterationCount < maxIterations) {
    iterationCount++;
    
    // Calculate remaining space
    const remainingSpaces = totalAvailableSpaces - currentPlacedCharacters;
    console.log(`🔄 Iteration ${iterationCount}: ${remainingSpaces} spaces remaining`);
    
    // Generate a batch of words of various lengths (3-8 characters)
    const wordLengths = [3, 4, 5, 6, 7, 8];
    const batchSize = 5;
    let wordsPlacedThisIteration = 0;
    
    try {
      set((state: any) => ({
        ...state,
        generationStep: `Iteration ${iterationCount}: Generating ${batchSize} words...`
      }));
      
      const geminiStore = useGeminiStore.getState();
      const newWords = await geminiStore.actions.generateWords(batchSize);
      
      console.log(`📝 Generated ${newWords.length} words in iteration ${iterationCount}`);
      
      // Try to place each generated word
      for (const wordData of newWords) {
        if (wordData.word.length < 3) continue; // Skip short words
        
        // Find all valid positions for this word
        const validPositions = findAllValidPositionsForWord(
          wordData.word, 
          grid, 
          availablePositions
        );
        
        if (validPositions.length > 0) {
          // Pick a random valid position
          const position = validPositions[Math.floor(Math.random() * validPositions.length)];
          
          // Create new word search word
          const newWordSearchWord: WordSearchWord = {
            ...wordData,
            placed: true,
            startRow: position.row,
            startCol: position.col,
            direction: position.direction
          };
          
          // Place the word in grid
          placeWordInGrid(newWordSearchWord, position, position.direction, grid);
          
          // Add to words array
          allWords.push(newWordSearchWord);
          wordsPlacedThisIteration++;
          currentPlacedCharacters += newWordSearchWord.word.length;
          
          console.log(`✅ Placed "${newWordSearchWord.word}" (${newWordSearchWord.word.length} chars) at (${position.row}, ${position.col}) ${position.direction}`);
          
          // Update UI every few placements
          if (wordsPlacedThisIteration % 2 === 0) {
            set((state: any) => ({
              ...state,
              grid: [...grid.map(row => [...row])],
              words: [...allWords],
              generationStep: `Iteration ${iterationCount}: Placed ${wordsPlacedThisIteration} words (${currentPlacedCharacters}/${totalAvailableSpaces})`
            }));
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      console.log(`📊 Iteration ${iterationCount} complete: placed ${wordsPlacedThisIteration} words`);
      
      // If we couldn't place any words this iteration, we're likely done
      if (wordsPlacedThisIteration === 0) {
        console.log('🔚 No words placed this iteration, stopping...');
        break;
      }
      
      // Update UI after each iteration
      set((state: any) => ({
        ...state,
        grid: [...grid.map(row => [...row])],
        words: [...allWords],
        generationStep: `Completed iteration ${iterationCount}: ${currentPlacedCharacters}/${totalAvailableSpaces} characters`
      }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`⚠️ Error in iteration ${iterationCount}:`, error);
      break;
    }
  }
  
  const finalPlacedWords = allWords.filter(w => w.placed).length;
  const fillPercentage = ((currentPlacedCharacters / totalAvailableSpaces) * 100).toFixed(1);
  
  console.log(`🎯 Final results: ${finalPlacedWords} words placed, ${currentPlacedCharacters}/${totalAvailableSpaces} characters (${fillPercentage}%)`);
  
  return allWords;
}

// Phase 1: Place existing words systematically
async function placeExistingWordsSystematically(
  grid: GridCell[][],
  words: WordSearchWord[],
  availablePositions: boolean[][],
  set: any
): Promise<WordSearchWord[]> {
  
  // Sort words by length (longest first for better placement)
  const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
  let placedCount = words.filter(w => w.placed).length; // Count already placed
  
  for (const word of sortedWords) {
    if (word.placed) continue;
    
    // Find ALL valid positions for this word
    const validPositions = findAllValidPositionsForWord(
      word.word, 
      grid, 
      availablePositions
    );
    
    if (validPositions.length > 0) {
      // Pick random position from valid ones
      const position = validPositions[Math.floor(Math.random() * validPositions.length)];
      
      // Place the word
      placeWordInGrid(word, position, position.direction, grid);
      word.placed = true;
      word.startRow = position.row;
      word.startCol = position.col;
      word.direction = position.direction;
      
      placedCount++;
      console.log(`✅ Placed "${word.word}" at (${position.row}, ${position.col}) ${position.direction}`);
      
      // Update UI
      set((state: any) => ({
        ...state,
        grid: [...grid.map(row => [...row])],
        words: [...words],
        generationStep: `Placing existing words... (${placedCount}/${words.length})`
      }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`📊 Placed ${placedCount - words.filter(w => w.placed).length} existing words`);
  return words;
}

// Helper: Find all valid positions for a specific word
function findAllValidPositionsForWord(
  word: string,
  grid: GridCell[][],
  availablePositions: boolean[][]
): Array<{ row: number; col: number; direction: WordSearchWord['direction'] }> {
  
  const positions: Array<{ row: number; col: number; direction: WordSearchWord['direction'] }> = [];
  const directions: WordSearchWord['direction'][] = ['horizontal', 'vertical', 'diagonal-down', 'diagonal-up'];
  
  // Check every position in grid
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      for (const direction of directions) {
        if (canPlaceWord(word, row, col, direction, grid, availablePositions)) {
          positions.push({ row, col, direction });
        }
      }
    }
  }
  
  return positions;
}

// Helper function to fill remaining spaces with random letters
async function fillRemainingSpacesWithRandomLetters(grid: GridCell[][], availablePositions: boolean[][], set: any): Promise<void> {
  console.log('🎲 Filling remaining spaces with random letters...');
  
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let filledCount = 0;
  
  // Calculate only available positions that need filling
  const positionsToFill: {row: number, col: number}[] = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[0].length; col++) {
      if (availablePositions[row][col] && !grid[row][col].letter) {
        positionsToFill.push({row, col});
      }
    }
  }
  
  const totalToFill = positionsToFill.length;
  console.log(`🎯 Found ${totalToFill} available positions to fill with random letters`);
  
  for (const {row, col} of positionsToFill) {
    grid[row][col].letter = letters[Math.floor(Math.random() * letters.length)];
    filledCount++;
    
    // Update state every 50 letters or at the end for visual effect
    if (filledCount % 50 === 0 || filledCount === totalToFill) {
      set((state: any) => ({
        ...state,
        grid: [...grid.map(row => [...row])],
        generationStep: `Filling spaces... (${filledCount}/${totalToFill})`
      }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`✅ Filled ${filledCount} empty spaces with random letters`);
}