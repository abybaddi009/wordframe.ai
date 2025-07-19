import { Button } from "@/components/ui/button";
import { Grid3X3 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  activePage?: string;
}

export function Header({ activePage }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (location.pathname === '/') {
      // If we're on the home page, scroll to hero
      const heroElement = document.getElementById('home');
      if (heroElement) {
        heroElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If we're on a different page, navigate to home page
      navigate('/');
    }
  };
  
  const handleGalleryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (location.pathname === '/') {
      // If we're on the home page, scroll to gallery
      const galleryElement = document.getElementById('gallery');
      if (galleryElement) {
        galleryElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If we're on a different page, navigate to home page first, then scroll
      navigate('/');
      setTimeout(() => {
        const galleryElement = document.getElementById('gallery');
        if (galleryElement) {
          galleryElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };
  
  return (
    <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <a 
          href="/" 
          onClick={handleHomeClick}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Grid3X3 className="w-8 h-8 text-purple-600" />
          <span className="text-2xl font-bold text-gray-800">WordFrame</span>
        </a>
        <nav className="hidden md:flex space-x-8">
          <a 
            href="/" 
            onClick={handleHomeClick}
            className={`text-gray-600 hover:text-purple-600 transition-colors cursor-pointer ${activePage === 'home' ? 'text-purple-600 font-medium' : ''}`}
          >
            Home
          </a>
          <a 
            href="#gallery" 
            onClick={handleGalleryClick}
            className={`text-gray-600 hover:text-purple-600 transition-colors cursor-pointer ${activePage === 'gallery' ? 'text-purple-600 font-medium' : ''}`}
          >
            Gallery
          </a>
          <Link to="/about" className={`text-gray-600 hover:text-purple-600 transition-colors ${activePage === 'about' ? 'text-purple-600 font-medium' : ''}`}>About</Link>
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