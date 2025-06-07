import { Button } from "@/components/ui/button";
import { Camera, Sparkles, Upload, ArrowRight, ChevronDown } from "lucide-react";

interface HeroProps {
  scrollY: number;
}

export function Hero({ scrollY }: HeroProps) {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Parallax Background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700"
        style={{
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      />
      
      {/* Hero Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <div className="mb-8">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Transform Photos into
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
            Word Search Magic
          </span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
          Upload your favorite photos and watch them come alive as interactive word search puzzles. 
          ASCII art meets word games in the most creative way possible.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" className=" text-white text-lg px-8 py-4">
            <Upload className="w-5 h-5 mr-2" />
            <span>Create Your Puzzle</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button size="lg" variant="ghost">
            <Camera className="w-5 h-5 mr-2" />
            <span>See the gallery</span>
          </Button>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
        <ChevronDown className="w-8 h-8" />
      </div>
    </section>
  );
} 