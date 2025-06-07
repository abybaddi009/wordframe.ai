import React from 'react';
import { useWordSearchStore } from '@/lib/word-search-store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Shuffle, RotateCcw, Loader2 } from 'lucide-react';

interface WordSearchGridProps {
  className?: string;
}

export function WordSearchGrid({ className }: WordSearchGridProps) {
  const { 
    grid, 
    words, 
    isGenerating, 
    generationStep, 
    error,
    actions 
  } = useWordSearchStore();

  const placedWords = words.filter(word => word.placed);
  const unplacedWords = words.filter(word => !word.placed);

  // Calculate appropriate cell size based on grid dimensions
  const getCellSize = () => {
    if (grid.length === 0) return 20;
    
    const maxGridSize = 600; // Maximum grid size in pixels
    const maxCellSize = Math.floor(maxGridSize / Math.max(grid.length, grid[0]?.length || 1));
    return Math.max(8, Math.min(20, maxCellSize)); // Between 8px and 20px
  };

  const cellSize = getCellSize();

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
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <div className="text-center">
              <p className="font-semibold text-gray-900">Generating Puzzle...</p>
              <p className="text-sm text-gray-600 mt-1">{generationStep}</p>
            </div>
          </div>
        </CardContent>
      </Card>
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
                        flex items-center justify-center border border-gray-200 font-bold
                        ${cell.isWordLetter 
                          ? 'bg-purple-100 text-purple-800' 
                          : cell.letter 
                            ? 'bg-gray-50 text-gray-600' 
                            : 'bg-white'
                        }
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