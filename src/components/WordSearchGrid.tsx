
import { useWordSearchStore } from '@/lib/word-search-store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Shuffle, RotateCcw, Loader2, Printer } from 'lucide-react';

interface WordSearchGridProps {
  className?: string;
}

export function WordSearchGrid({ className }: WordSearchGridProps) {
  const { 
    grid, 
    words, 
    availablePositions,
    isGenerating, 
    generationStep, 
    error,
    paperWidth,
    paperHeight,
    actions 
  } = useWordSearchStore();

  const placedWords = words.filter(word => word.placed);
  const unplacedWords = words.filter(word => !word.placed);

  // Print functionality
  const handlePrint = () => {
    if (grid.length === 0) return;

    // Calculate print dimensions
    const gridCols = grid[0]?.length || 0;
    const gridRows = grid.length;
    
    // Calculate optimal cell size for print based on paper size and character density
    const availableWidth = paperWidth * 0.8; // Use 80% of paper width for margins
    const availableHeight = paperHeight * 0.6; // Use 60% of paper height for grid (rest for word list)
    
    const cellWidthMm = availableWidth / gridCols;
    const cellHeightMm = availableHeight / gridRows;
    const cellSizeMm = Math.min(cellWidthMm, cellHeightMm, 6); // Max 6mm per cell
    
    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Word Search Puzzle</title>
          <style>
            @page {
              size: ${paperWidth}mm ${paperHeight}mm;
              margin: 10mm;
            }
            
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
            
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
              background: #fff;
            }
            
            .puzzle-container {
              width: 100%;
              max-width: ${paperWidth - 20}mm;
              margin: 0 auto;
            }
            
            .puzzle-title {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10mm;
              font-family: Arial, sans-serif;
            }
            
            .grid-container {
              display: flex;
              justify-content: center;
              margin-bottom: 8mm;
            }
            
            .grid {
              border: 2px solid #000;
              background: #fff;
            }
            
            .grid-row {
              display: flex;
            }
            
            .grid-cell {
              width: ${cellSizeMm}mm;
              height: ${cellSizeMm}mm;
              border: 1px solid #000;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: ${Math.max(6, cellSizeMm * 0.6)}px;
              background: #fff;
            }
            
            .word-list {
              margin-top: 5mm;
            }
            
            .word-list-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 3mm;
              font-family: Arial, sans-serif;
            }
            
            .words-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
              gap: 2mm;
              font-size: 11px;
            }
            
            .word-item {
              padding: 1mm;
              border: 1px solid #ccc;
              text-align: center;
              background: #f8f8f8;
            }
          </style>
        </head>
        <body>
          <div class="puzzle-container">
            <div class="puzzle-title">Word Search Puzzle</div>
            
            <div class="grid-container">
              <div class="grid">
                ${grid.map(row => `
                  <div class="grid-row">
                    ${row.map(cell => `
                      <div class="grid-cell">${cell.letter || ''}</div>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
            
            ${placedWords.length > 0 ? `
              <div class="word-list">
                <div class="word-list-title">Find these words:</div>
                <div class="words-grid">
                  ${placedWords.map(word => `
                    <div class="word-item">${word.word}</div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Trigger print dialog after content loads
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
  };

  // Calculate appropriate cell size based on grid dimensions
  const getCellSize = () => {
    if (grid.length === 0) return 20;
    
    const maxGridSize = 600; // Maximum grid size in pixels
    const maxCellSize = Math.floor(maxGridSize / Math.max(grid.length, grid[0]?.length || 1));
    return Math.max(8, Math.min(20, maxCellSize)); // Between 8px and 20px
  };

  const cellSize = getCellSize();

  // Helper function to determine cell styling
  const getCellStyling = (cell: any, rowIndex: number, colIndex: number) => {
    // During generation, show available positions
    if (isGenerating && availablePositions.length > 0) {
      const isAvailable = availablePositions[rowIndex]?.[colIndex];
      
      if (cell.isWordLetter) {
        return 'bg-purple-200 text-purple-900 border-purple-300';
      } else if (cell.letter) {
        return 'bg-gray-100 text-gray-700 border-gray-200';
      } else if (isAvailable) {
        return 'bg-green-50 text-green-600 border-green-200 animate-pulse';
      } else {
        return 'bg-red-50 text-red-400 border-red-200';
      }
    }
    
    // Normal display after generation
    if (cell.isWordLetter) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (cell.letter) {
      return 'bg-gray-50 text-gray-600 border-gray-200';
    } else {
      return 'bg-white border-gray-200';
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="font-semibold">Error generating puzzle:</p>
            <p className="text-sm mt-1">{error}</p>
            <Button 
              variant="outline" 
              onClick={actions.clearError}
              className="mt-4"
            >
              Clear Error
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Generation Progress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <div className="text-center">
                <p className="font-semibold text-gray-900">Generating Puzzle...</p>
                <p className="text-sm text-purple-600 mt-1">{generationStep}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show grid during generation if available */}
        {grid.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Puzzle Progress
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {availablePositions.length > 0 && (
                    <>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                        <span className="text-xs">Available</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                        <span className="text-xs">Blocked</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
                        <span className="text-xs">Words</span>
                      </div>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {/* Grid */}
                <div 
                  className="inline-block border-2 border-gray-300 bg-white p-2 rounded-lg shadow-sm"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: `${Math.max(8, cellSize - 4)}px`,
                    lineHeight: '1'
                  }}
                >
                  {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex">
                      {row.map((cell, colIndex) => (
                        <div
                          key={colIndex}
                          className={`
                            flex items-center justify-center font-bold transition-all duration-200
                            ${getCellStyling(cell, rowIndex, colIndex)}
                          `}
                          style={{
                            width: `${cellSize}px`,
                            height: `${cellSize}px`,
                            fontSize: `${Math.max(6, cellSize - 8)}px`
                          }}
                        >
                          {cell.letter}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                
                {/* Generation Stats */}
                <div className="text-xs text-gray-500 text-center space-y-1">
                  <p>Grid: {grid[0]?.length || 0} × {grid.length} characters</p>
                  {availablePositions.length > 0 && (
                    <p>
                      Available: {availablePositions.flat().filter(Boolean).length} / {availablePositions.flat().length} spaces
                      ({((availablePositions.flat().filter(Boolean).length / availablePositions.flat().length) * 100).toFixed(1)}%)
                    </p>
                  )}
                  <p>
                    Words placed: {placedWords.length} / {words.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (grid.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>No puzzle generated yet</p>
            <p className="text-sm mt-1">Upload an image and add words to create your puzzle</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Grid Display */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Word Search Puzzle</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isGenerating || grid.length === 0}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.shuffleWords}
              disabled={isGenerating}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.reset}
              disabled={isGenerating}
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {/* Grid */}
            <div 
              className="inline-block border-2 border-gray-300 bg-white p-2 rounded-lg shadow-sm"
              style={{
                fontFamily: 'monospace',
                fontSize: `${Math.max(8, cellSize - 4)}px`,
                lineHeight: '1'
              }}
            >
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((cell, colIndex) => (
                    <div
                      key={colIndex}
                      className={`
                        flex items-center justify-center border font-bold
                        ${getCellStyling(cell, rowIndex, colIndex)}
                      `}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        fontSize: `${Math.max(6, cellSize - 8)}px`
                      }}
                    >
                      {cell.letter}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            {/* Grid Stats */}
            <div className="text-xs text-gray-500 text-center">
              <p>Grid: {grid[0]?.length || 0} × {grid.length} characters</p>
              <p>
                Characters: {grid.flat().filter(cell => cell.letter).length} / {grid.flat().length} 
                ({((grid.flat().filter(cell => cell.letter).length / grid.flat().length) * 100).toFixed(1)}% filled)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Word Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Placed Words */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-700">
              Found Words ({placedWords.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {placedWords.length === 0 ? (
              <p className="text-sm text-gray-500">No words placed yet</p>
            ) : (
              <div className="space-y-2">
                {placedWords.map((word, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {word.word}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {word.direction} ({word.startRow}, {word.startCol})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unplaced Words */}
        {unplacedWords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-orange-700">
                Unplaced Words ({unplacedWords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unplacedWords.map((word, index) => (
                  <Badge key={index} variant="outline" className="border-orange-200 text-orange-700">
                    {word.word}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                These words couldn't be placed in the available space
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Word Hints */}
      {placedWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Word Clues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {placedWords.map((word, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {word.word}
                  </Badge>
                  <span className="text-sm text-gray-600 flex-1">
                    {word.hint}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 