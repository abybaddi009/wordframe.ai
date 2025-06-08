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
    if (grid[row][col].letter && grid[row][col].letter === word[i]) {
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
    if (!existingLetter || existingLetter === word.word[i]) {
      grid[row][col].letter = word.word[i];
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
    if (existingLetter && existingLetter !== word[i]) {
      return false; // Cannot place - letters don't match
    }
  }
  
  return true;
}

interface ContiguousLength {
  horizontal: number;
  vertical: number;
  diagonalDown: number;
  diagonalUp: number;
}

async function newPlacementAlgorithmWithUpdates(
  grid: GridCell[][],
  words: WordSearchWord[],
  availablePositions: boolean[][],
  set: any,
  totalAvailableSpaces: number
): Promise<WordSearchWord[]> {
  console.log('🆕 Starting new placement algorithm with visual updates...');
  
  const allWords = [...words];
  const visitedPositions = new Set<string>();
  
  // Sort words by length (smallest first for the length check)
  const sortedWords = [...words].sort((a, b) => a.word.length - b.word.length);
  const smallestWordLength = sortedWords[0]?.word.length || 1;
  
  // Find the first available position as starting point
  let currentRow = 0;
  let currentCol = 0;
  let foundStart = false;
  
  for (let row = 0; row < grid.length && !foundStart; row++) {
    for (let col = 0; col < grid[0].length && !foundStart; col++) {
      if (availablePositions[row][col] && !grid[row][col].letter) {
        currentRow = row;
        currentCol = col;
        foundStart = true;
      }
    }
  }
  
  console.log('📊 Starting position:', { currentRow, currentCol });
  let currentOrientation: 'horizontal' | 'vertical' | 'diagonal' = 'horizontal';
  
  let placedCount = allWords.filter(w => w.placed).length; // Count already placed words
  let processedWords = 0;
  
  while (processedWords < allWords.length) {
    const positionKey = `${currentRow},${currentCol}`;
    
    // Skip if already visited this position
    if (visitedPositions.has(positionKey)) {
      const nextPosition = findNearestEmptyNeighbor(currentRow, currentCol, grid, availablePositions, visitedPositions);
      if (!nextPosition) break;
      currentRow = nextPosition.row;
      currentCol = nextPosition.col;
      continue;
    }
    
    visitedPositions.add(positionKey);
    
    // Step 2: Find max contiguous lengths in 4 directions
    const lengths = findContiguousLengths(currentRow, currentCol, grid, availablePositions);
    
    console.log(`📏 At position (${currentRow}, ${currentCol}), contiguous lengths:`, lengths);
    
    // Step 6: Check if any direction can fit the smallest word
    const maxLength = Math.max(lengths.horizontal, lengths.vertical, lengths.diagonalDown, lengths.diagonalUp);
    if (maxLength < smallestWordLength) {
      if (maxLength < 3) {
        console.log('🎯 Max contiguous length < 3, filling with random letters');
        await floodFillWithRandomLetters(grid, currentRow, currentCol, availablePositions);
      }
      console.log(`❌ Max contiguous length ${maxLength} < smallest word ${smallestWordLength}, stopping`);
      break;
    }
    
    // Step 3: Find words that fit the available lengths
    const remainingWords = allWords.filter(w => !w.placed);
    
    const suitableWords = findSuitableWords(remainingWords, lengths);
    
    if (suitableWords.length === 0) {
      // No suitable words found, check if we should generate one
      const placedCharacters = allWords.filter(w => w.placed).reduce((sum, w) => sum + w.word.length, 0);
      const targetCharacters = Math.floor(totalAvailableSpaces * 0.4);
      
      if (placedCharacters < targetCharacters && maxLength >= 3) {
        // Generate a word that fits the available space
        const idealLength = Math.min(maxLength, 8); // Cap at 8 characters for readability
        
        try {
          console.log(`🔤 Generating word of length ${idealLength} for position (${currentRow}, ${currentCol})`);
          set((state: any) => ({
            ...state,
            generationStep: `Generating word (length ${idealLength})...`
          }));
          
          const geminiStore = useGeminiStore.getState();
          const newWords = await geminiStore.actions.generateWords(1);
          
          if (newWords.length > 0) {
            // Find a word that fits, or use the first one and truncate if necessary
            let selectedWord = newWords[0];
            if (selectedWord.word.length > idealLength) {
              // Truncate the word to fit
              selectedWord = {
                ...selectedWord,
                word: selectedWord.word.substring(0, idealLength).toUpperCase()
              };
            }
            
            const newWordSearchWord: WordSearchWord = {
              ...selectedWord,
              placed: false,
              startRow: 0,
              startCol: 0,
              direction: 'horizontal'
            };
            
            // Add the new word to our words array
            allWords.push(newWordSearchWord);
            
            console.log(`✅ Generated and added word: "${newWordSearchWord.word}"`);
            
            // Try to place this new word immediately
            const direction = getBestDirectionForWord(newWordSearchWord, lengths, currentOrientation);
            
            if (canPlaceWord(newWordSearchWord.word, currentRow, currentCol, direction, grid, availablePositions)) {
              // Place the word
              placeWordInGrid(
                newWordSearchWord, 
                { row: currentRow, col: currentCol }, 
                direction, 
                grid
              );
              
              newWordSearchWord.placed = true;
              newWordSearchWord.startRow = currentRow;
              newWordSearchWord.startCol = currentCol;
              newWordSearchWord.direction = direction;
              
              placedCount++;
              console.log(`✅ Placed generated word "${newWordSearchWord.word}" at (${currentRow}, ${currentCol}) ${direction}`);
              
              // Update the grid state to show the new word
              set((state: any) => ({
                ...state,
                grid: [...grid.map(row => [...row])],
                words: [...allWords],
                generationStep: `Placing words... (${placedCount}/${allWords.length})`
              }));
              
              // Small delay to show each word placement
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Change orientation for next word
              currentOrientation = getNextOrientation(currentOrientation);
            } else {
              console.log(`❌ Could not place generated word "${newWordSearchWord.word}" at (${currentRow}, ${currentCol})`);
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to generate word, moving to next position');
        }
      }
      
      // Move to next position (whether we generated a word or not)
      const nextPosition = findNearestEmptyNeighbor(currentRow, currentCol, grid, availablePositions, visitedPositions);
      if (!nextPosition) break;
      currentRow = nextPosition.row;
      currentCol = nextPosition.col;
      continue;
    }
    
    // Step 4: Place the biggest suitable word
    const biggestWord = suitableWords[0]; // Already sorted by length desc in findSuitableWords
    const direction = getBestDirectionForWord(biggestWord, lengths, currentOrientation);
    
    if (canPlaceWord(biggestWord.word, currentRow, currentCol, direction, grid, availablePositions)) {
      // Place the word
      placeWordInGrid(
        biggestWord, 
        { row: currentRow, col: currentCol }, 
        direction, 
        grid
      );
      
      biggestWord.placed = true;
      biggestWord.startRow = currentRow;
      biggestWord.startCol = currentCol;
      biggestWord.direction = direction;
      
      placedCount++;
      console.log(`✅ Placed "${biggestWord.word}" at (${currentRow}, ${currentCol}) ${direction}`);
      
      // Update the grid state to show the new word - Visual Update
      set((state: any) => ({
        ...state,
        grid: [...grid.map(row => [...row])], // Create deep copy
        words: [...allWords],
        generationStep: `Placing words... (${placedCount}/${allWords.length})`
      }));
      
      // Small delay to show each word placement
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Change orientation for next word
      currentOrientation = getNextOrientation(currentOrientation);
    } else {
      console.log(`❌ Could not place "${biggestWord.word}" at (${currentRow}, ${currentCol})`);
    }
    
    processedWords++;
    
    // Step 5: Move to nearest empty neighbor
    const nextPosition = findNearestEmptyNeighbor(currentRow, currentCol, grid, availablePositions, visitedPositions);
    if (!nextPosition) break;
    currentRow = nextPosition.row;
    currentCol = nextPosition.col;
  }
  
  const finalPlacedCount = allWords.filter(w => w.placed).length;
  console.log(`📊 New algorithm results: ${finalPlacedCount}/${allWords.length} words placed`);
  
  return allWords;
}

function findContiguousLengths(
  row: number,
  col: number,
  grid: GridCell[][],
  availablePositions: boolean[][]
): ContiguousLength {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  const lengths: ContiguousLength = {
    horizontal: 0,
    vertical: 0,
    diagonalDown: 0,
    diagonalUp: 0
  };
  
  // Check horizontal (left to right from current position)
  for (let c = col; c < gridWidth; c++) {
    if (availablePositions[row][c] && !grid[row][c].letter) {
      lengths.horizontal++;
    } else {
      break;
    }
  }
  
  // Check vertical (top to bottom from current position)
  for (let r = row; r < gridHeight; r++) {
    if (availablePositions[r][col] && !grid[r][col].letter) {
      lengths.vertical++;
    } else {
      break;
    }
  }
  
  // Check diagonal down (down-right from current position)
  for (let i = 0; row + i < gridHeight && col + i < gridWidth; i++) {
    if (availablePositions[row + i][col + i] && !grid[row + i][col + i].letter) {
      lengths.diagonalDown++;
    } else {
      break;
    }
  }
  
  // Check diagonal up (up-right from current position)
  for (let i = 0; row - i >= 0 && col + i < gridWidth; i++) {
    if (availablePositions[row - i][col + i] && !grid[row - i][col + i].letter) {
      lengths.diagonalUp++;
    } else {
      break;
    }
  }
  
  return lengths;
}

function findSuitableWords(
  words: WordSearchWord[],
  lengths: ContiguousLength,
): WordSearchWord[] {
  const suitable: WordSearchWord[] = [];
  
  for (const word of words) {
    const wordLength = word.word.length;
    let canFit = false;
    
    // Check if word fits in any direction
    if (lengths.horizontal >= wordLength ||
        lengths.vertical >= wordLength ||
        lengths.diagonalDown >= wordLength ||
        lengths.diagonalUp >= wordLength) {
      canFit = true;
    }
    
    if (canFit) {
      suitable.push(word);
    }
  }
  
  // Sort by length (biggest first)
  return suitable.sort((a, b) => b.word.length - a.word.length);
}

function getBestDirectionForWord(
  word: WordSearchWord,
  lengths: ContiguousLength,
  preferredOrientation: 'horizontal' | 'vertical' | 'diagonal'
): WordSearchWord['direction'] {
  const wordLength = word.word.length;
  
  // Try preferred orientation first
  if (preferredOrientation === 'horizontal' && lengths.horizontal >= wordLength) {
    return 'horizontal';
  }
  if (preferredOrientation === 'vertical' && lengths.vertical >= wordLength) {
    return 'vertical';
  }
  if (preferredOrientation === 'diagonal') {
    if (lengths.diagonalDown >= wordLength) return 'diagonal-down';
    if (lengths.diagonalUp >= wordLength) return 'diagonal-up';
  }
  
  // Fall back to any available direction
  if (lengths.horizontal >= wordLength) return 'horizontal';
  if (lengths.vertical >= wordLength) return 'vertical';
  if (lengths.diagonalDown >= wordLength) return 'diagonal-down';
  if (lengths.diagonalUp >= wordLength) return 'diagonal-up';
  
  return 'horizontal'; // Default fallback
}

function getNextOrientation(current: 'horizontal' | 'vertical' | 'diagonal'): 'horizontal' | 'vertical' | 'diagonal' {
  switch (current) {
    case 'horizontal': return 'vertical';
    case 'vertical': return 'diagonal';
    case 'diagonal': return 'horizontal';
  }
}

function findNearestEmptyNeighbor(
  currentRow: number,
  currentCol: number,
  grid: GridCell[][],
  availablePositions: boolean[][],
  visitedPositions: Set<string>
): { row: number; col: number } | null {
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  const queue: Array<{ row: number; col: number; distance: number }> = [];
  const visited = new Set<string>();
  
  // Start BFS from current position
  queue.push({ row: currentRow, col: currentCol, distance: 0 });
  visited.add(`${currentRow},${currentCol}`);
  
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1], // Cardinal directions
    [-1, -1], [-1, 1], [1, -1], [1, 1] // Diagonal directions
  ];
  
  while (queue.length > 0) {
    const { row, col, distance } = queue.shift()!;
    
    // Skip current position
    if (distance > 0) {
      const posKey = `${row},${col}`;
      if (availablePositions[row][col] && 
          !grid[row][col].letter && 
          !visitedPositions.has(posKey)) {
        return { row, col };
      }
    }
    
    // Add neighbors to queue
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      const newKey = `${newRow},${newCol}`;
      
      if (newRow >= 0 && newRow < gridHeight &&
          newCol >= 0 && newCol < gridWidth &&
          !visited.has(newKey)) {
        visited.add(newKey);
        queue.push({ row: newRow, col: newCol, distance: distance + 1 });
      }
    }
  }
  
  return null; // No empty neighbors found
}

const floodFillWithRandomLetters = async (
  grid: GridCell[][], 
  row: number, 
  col: number, 
  availablePositions: boolean[][]
) => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  
  const queue: Array<{ row: number; col: number }> = [];
  const visited = new Set<string>();
  
  // Start flood fill from the given position
  queue.push({ row, col });
  visited.add(`${row},${col}`);
  
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1] // Cardinal directions only for flood fill
  ];
  
  let filledCount = 0;
  
  while (queue.length > 0) {
    const { row: currentRow, col: currentCol } = queue.shift()!;
    
    // Fill current position if it's empty and available
    if (availablePositions[currentRow][currentCol] && !grid[currentRow][currentCol].letter) {
      grid[currentRow][currentCol].letter = letters[Math.floor(Math.random() * letters.length)];
      filledCount++;
      console.log(`🎲 Filled position (${currentRow}, ${currentCol}) with ${grid[currentRow][currentCol].letter}`);
    }
    
    // Add neighboring positions to queue
    for (const [dr, dc] of directions) {
      const newRow = currentRow + dr;
      const newCol = currentCol + dc;
      const posKey = `${newRow},${newCol}`;
      
      // Check bounds and if position hasn't been visited
      if (newRow >= 0 && newRow < gridHeight &&
          newCol >= 0 && newCol < gridWidth &&
          !visited.has(posKey)) {
        
        // Only add to queue if position is available and empty
        if (availablePositions[newRow][newCol] && !grid[newRow][newCol].letter) {
          visited.add(posKey);
          queue.push({ row: newRow, col: newCol });
        }
      }
    }
  }
  
  console.log(`✅ Flood fill completed: filled ${filledCount} positions with random letters`);
}