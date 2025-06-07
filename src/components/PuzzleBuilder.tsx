import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Grid3X3, Settings, Sparkles, X, Sliders } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

import { useGeminiStore, type WordWithHint } from '@/lib/gemini';
import { useImageStore } from '@/lib/image-store';
import { useWordSearchStore } from '@/lib/word-search-store';
import { ImageProcessor } from './ImageProcessor';
import { WordSearchGrid } from './WordSearchGrid';

interface PuzzleBuilderForm {
  currentWord: string;
}

type ViewportSize = 'A4' | 'A3' | 'Legal';

interface ViewportDimensions {
  width: number;
  height: number;
  name: string;
}

const VIEWPORT_SIZES: Record<ViewportSize, ViewportDimensions> = {
  A4: { width: 400, height: 566, name: 'A4 (210 × 297mm)' },
  A3: { width: 566, height: 800, name: 'A3 (297 × 420mm)' },
  Legal: { width: 400, height: 650, name: 'Legal (8.5 × 14in)' }
};

export function PuzzleBuilder() {
  const [selectedViewport, setSelectedViewport] = useState<ViewportSize>('A4');
  const [isHorizontal, setIsHorizontal] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [showImageProcessor, setShowImageProcessor] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(false);

  const { initializeGemini, generateWords, generateWordsFromBase, clearError } = useGeminiStore(state => state.actions);
  const { thresholdImage, actions: imageActions } = useImageStore();
  const { 
    charactersPerMm, 
    words: wordSearchWords, 
    actions: wordSearchActions 
  } = useWordSearchStore();

  const { register, handleSubmit, watch, setValue, reset } = useForm<PuzzleBuilderForm>({
    defaultValues: {
      currentWord: ''
    }
  });

  useEffect(() => {
    initializeGemini(import.meta.env.VITE_GOOGLE_AI_API_KEY);
  }, []);

  // Update word search store when viewport changes
  useEffect(() => {
    const viewport = VIEWPORT_SIZES[selectedViewport];
    const width = isHorizontal ? viewport.height : viewport.width;
    const height = isHorizontal ? viewport.width : viewport.height;
    
    // Convert mm to actual dimensions (assuming 1 viewport unit = 1mm for simplicity)
    const widthMm = (width / 400) * 210; // Scale relative to A4
    const heightMm = (height / 566) * 297;
    
    wordSearchActions.setPaperDimensions(widthMm, heightMm);
  }, [selectedViewport, isHorizontal, wordSearchActions]);

  const currentWord = watch('currentWord');

  const handleAddWord = () => {
    const word = currentWord.trim().toUpperCase();
    if (word && !words.includes(word)) {
      const newWords = [...words, word];
      setWords(newWords);
      
      // Convert to WordWithHint format and update word search store
      const wordsWithHints: WordWithHint[] = newWords.map(w => ({
        word: w,
        hint: `Find the word: ${w.toLowerCase()}`
      }));
      wordSearchActions.setWords(wordsWithHints);
      
      setValue('currentWord', '');
    }
  };

  const handleGenerateWords = async () => {
    try {
      const generatedWords = await generateWords(5);
      const newWords = [...words, ...generatedWords.map(w => w.word)];
      setWords(newWords);
      
      // Update word search store with all words including hints
      const allWordsWithHints: WordWithHint[] = [
        ...words.map(w => ({ word: w, hint: `Find the word: ${w.toLowerCase()}` })),
        ...generatedWords
      ];
      wordSearchActions.setWords(allWordsWithHints);
    } catch (error) {
      console.error('Failed to generate words:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddWord();
    }
  };

  const removeWord = (wordToRemove: string) => {
    const newWords = words.filter(word => word !== wordToRemove);
    setWords(newWords);
    
    // Update word search store
    const wordsWithHints: WordWithHint[] = newWords.map(w => ({
      word: w,
      hint: `Find the word: ${w.toLowerCase()}`
    }));
    wordSearchActions.setWords(wordsWithHints);
  };

  const handleGeneratePuzzle = async () => {
    if (!thresholdImage || words.length === 0) return;
    
    try {
      setShowPuzzle(true);
      await wordSearchActions.generatePuzzle(thresholdImage);
    } catch (error) {
      console.error('Failed to generate puzzle:', error);
    }
  };

  const currentViewport = VIEWPORT_SIZES[selectedViewport];
  const aspectRatio = isHorizontal 
    ? currentViewport.height / currentViewport.width
    : currentViewport.width / currentViewport.height;

  return (
    <div className="min-w-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Grid3X3 className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-800">WordFrame Builder</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Word Search Puzzle Builder</h1>
            <p className="text-gray-600">Upload an image and add words to create your custom word search puzzle</p>
          </div>

          {/* Main Layout */}
          <div className="flex gap-6">
            {/* Left Pane - 70% */}
            <div className="flex-[0.7] flex flex-col gap-4">
              {/* Puzzle Configuration */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sliders className="w-5 h-5" />
                    Puzzle Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Paper Size</Label>
                      <Select value={selectedViewport} onValueChange={(value: ViewportSize) => setSelectedViewport(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VIEWPORT_SIZES).map(([key, viewport]) => (
                            <SelectItem key={key} value={key}>
                              {viewport.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Orientation</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch 
                          id="orientation"
                          checked={isHorizontal} 
                          onCheckedChange={setIsHorizontal} 
                        />
                        <Label htmlFor="orientation" className="text-sm">
                          {isHorizontal ? 'Landscape' : 'Portrait'}
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Characters per mm</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={charactersPerMm}
                          onChange={(e) => wordSearchActions.setCharactersPerMm(parseFloat(e.target.value))}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-500">Smaller = denser text</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Show Puzzle</span>
                      <Switch 
                        checked={showPuzzle} 
                        onCheckedChange={setShowPuzzle}
                        disabled={!thresholdImage || words.length === 0}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Processing and Puzzle Preview */}
              {!thresholdImage || showImageProcessor ? (
                <ImageProcessor
                  aspectRatio={aspectRatio}
                  onComplete={(processedImage) => {
                    setShowImageProcessor(false);
                  }}
                  onCancel={() => {
                    setShowImageProcessor(false);
                    imageActions.reset();
                  }}
                />
              ) : showPuzzle ? (
                <WordSearchGrid className="flex-1" />
              ) : (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Image Preview</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost" 
                        className="text-white"
                        onClick={() => setShowImageProcessor(true)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Image
                      </Button>
                      <Button 
                        variant="default"
                        onClick={handleGeneratePuzzle}
                        disabled={!thresholdImage || words.length === 0}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Puzzle
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white"
                      style={{
                        width: isHorizontal ? currentViewport.height : currentViewport.width,
                        height: isHorizontal ? currentViewport.width : currentViewport.height,
                        maxWidth: '100%',
                        maxHeight: '100%'
                      }}
                    >
                      <div className="relative w-full h-full">
                        <img
                          src={thresholdImage}
                          alt="Processed image"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Word Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Words</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="word-input">Type words and press Enter to add them</Label>
                    <div className="flex gap-2">
                    <Textarea
                      id="word-input"
                      placeholder="Type a word and press Enter..."
                      className="min-h-[120px]"
                      {...register('currentWord')}
                      onKeyDown={handleKeyPress}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateWords}
                      className="border-purple-200 text-purple-600 hover:bg-purple-50"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate 5 Words
                    </Button>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Press Enter to add words</span>
                      <span>{words.length} words added</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Pane - 30% */}
            <div className="flex-[0.3]">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Word List</CardTitle>
                  {words.length > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setWords([]);
                        wordSearchActions.setWords([]);
                        reset();
                      }}
                      className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  </div>
                </CardHeader>
                <CardContent className="h-full overflow-y-auto">
                  {words.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                      <p className="text-center">No words added yet</p>
                      <p className="text-sm text-center mt-1">Start typing in the text area to add words</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {words.map((word, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center justify-between w-full px-3 py-2 text-sm"
                        >
                          <span className="capitalize">{word}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-red-100 text-gray-500 hover:text-red-600"
                            onClick={() => removeWord(word)}
                          >
                            ×
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 