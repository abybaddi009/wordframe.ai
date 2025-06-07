import { Button } from "@/components/ui/button";
import { Grid3X3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  
  return (
    <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <Grid3X3 className="w-8 h-8 text-purple-600" />
          <span className="text-2xl font-bold text-gray-800">WordFrame</span>
        </Link>
        <nav className="hidden md:flex space-x-8">
          <Link to="/" className={`text-gray-600 hover:text-purple-600 transition-colors ${location.pathname === '/' ? 'text-purple-600 font-medium' : ''}`}>
            Home
          </Link>
          <a href="#gallery" className="text-gray-600 hover:text-purple-600 transition-colors">Gallery</a>
          <a href="#about" className="text-gray-600 hover:text-purple-600 transition-colors">About</a>
          <a href="#contact" className="text-gray-600 hover:text-purple-600 transition-colors">Contact</a>
        </nav>
        <Link to="/builder">
          <Button className="bg-purple-600 hover:bg-purple-700">
            Try Now
          </Button>
        </Link>
      </div>
    </header>
  );
} 