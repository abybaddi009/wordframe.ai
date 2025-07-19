import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid3X3, Camera, Sparkles, Heart, Users, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-w-screen min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Header activePage="about" />
      
      {/* Main About Section */}
      <section className="pt-24 pb-20 relative overflow-hidden">
        {/* Parallax Background Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            transform: `translateY(${scrollY * 0.2}px)`,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="mb-8">
              <Grid3X3 className="w-20 h-20 mx-auto mb-4 text-purple-600" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-800">
              About <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">WordFrame</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Where creativity meets technology. Transform your cherished memories into interactive puzzles 
              that blend the art of ASCII with the joy of word searching.
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left Content */}
            <div className="space-y-8">
              <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl text-purple-700">
                    <Sparkles className="w-8 h-8 mr-3 text-purple-600" />
                    Our Mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    WordFrame was born from a simple idea: what if we could turn every photo into a unique, 
                    interactive experience? We combine the nostalgic charm of ASCII art with the engaging 
                    challenge of word search puzzles, creating something entirely new and magical.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl text-blue-700">
                    <Camera className="w-8 h-8 mr-3 text-blue-600" />
                    How It Works
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Upload any photo and watch our advanced AI transform it into beautiful ASCII art. 
                    Then, we weave carefully selected words into the artwork, creating a word search puzzle 
                    that maintains the essence of your original image while adding layers of interactive fun.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Content */}
            <div className="space-y-8">
              <Card className="border-0 bg-gradient-to-br from-pink-50 to-purple-50 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl text-pink-700">
                    <Heart className="w-8 h-8 mr-3 text-pink-600" />
                    Why We Built This
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    In a world of digital noise, we wanted to create something that brings people together. 
                    Whether it's a family photo turned into a puzzle for game night, or a landscape that 
                    becomes an artistic challenge, WordFrame makes every image a story worth sharing.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-xl transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl text-indigo-700">
                    <Zap className="w-8 h-8 mr-3 text-indigo-600" />
                    The Technology
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    Built with cutting-edge web technologies and powered by intelligent algorithms, 
                    WordFrame processes images in real-time, ensuring every puzzle is unique, 
                    challenging, and beautiful. No downloads, no installations—just pure creative magic 
                    in your browser.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-purple-200">
              <Users className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-3xl font-bold text-gray-800 mb-2">10,000+</h3>
              <p className="text-gray-600">Puzzles Created</p>
            </div>
            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-200">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-pink-600" />
              <h3 className="text-3xl font-bold text-gray-800 mb-2">500+</h3>
              <p className="text-gray-600">Happy Users</p>
            </div>
            <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-blue-200">
              <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-3xl font-bold text-gray-800 mb-2">∞</h3>
              <p className="text-gray-600">Possibilities</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl p-12 text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Transform your first photo into a WordFrame puzzle and discover the magic for yourself.
            </p>
            <Link to="/builder">
              <Button size="lg" variant="secondary" className="text-white px-12 py-6 text-lg">
                <Camera className="w-6 h-6 mr-3" />
                <span>Create Your First Puzzle</span>
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}