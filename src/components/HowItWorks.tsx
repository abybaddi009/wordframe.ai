import { Upload, Grid3X3, Sparkles } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface HowItWorksProps {
  scrollY: number;
}

export function HowItWorks({ scrollY }: HowItWorksProps) {
  return (
    <section className="py-20 bg-white relative">
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          transform: `translateY(${scrollY * 0.2}px)`,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-800">
          How It <span className="text-purple-600">Works</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center border-0 bg-gradient-to-b from-purple-50 to-pink-50 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold mb-4 text-gray-800">Upload Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Choose your favorite image and upload it to our platform. Any photo works - portraits, landscapes, or abstract art.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center border-0 bg-gradient-to-b from-blue-50 to-indigo-50 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Grid3X3 className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold mb-4 text-gray-800">ASCII Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                Our AI converts your image into beautiful ASCII art, preserving the essence and details of your original photo.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="text-center border-0 bg-gradient-to-b from-pink-50 to-purple-50 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold mb-4 text-gray-800">Word Magic</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                ASCII characters are replaced with meaningful words, while empty spaces are filled with puzzle words for the ultimate challenge.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
} 