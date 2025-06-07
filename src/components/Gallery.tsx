import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardAction 
} from "@/components/ui/card";
import { Image as ImageIcon, Sparkles, ArrowRight } from "lucide-react";

interface GalleryProps {
  scrollY: number;
}

export function Gallery({ scrollY }: GalleryProps) {
  return (
    <section id="gallery" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateY(${scrollY * 0.1}px)`,
        }}
      >
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-200 rounded-full opacity-20"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-pink-200 rounded-full opacity-20"></div>
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-800">
          Example <span className="text-purple-600">Creations</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Card 
              key={item} 
              className="group cursor-pointer border-0 bg-gradient-to-br from-purple-400 to-pink-400 text-white hover:shadow-2xl transition-all duration-300 hover:scale-105 aspect-square relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
              <CardHeader className="relative z-10 px-4">
                <CardAction>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </CardAction>
                <CardTitle className="text-white text-lg font-semibold">
                  Example {item}
                </CardTitle>
                <CardDescription className="text-white/80 text-sm">
                  Word Search Puzzle
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 flex-1 flex items-center justify-center px-4">
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-80" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button size="lg" variant="secondary" className="text-white">
            <span>View Full Gallery</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
} 