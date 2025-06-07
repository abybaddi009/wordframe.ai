import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { Gallery } from '@/components/Gallery';
import { CallToAction } from '@/components/CallToAction';
import { Footer } from '@/components/Footer';

export function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-w-screen min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <Header />
      <Hero scrollY={scrollY} />
      <HowItWorks scrollY={scrollY} />
      <Gallery scrollY={scrollY} />
      <CallToAction scrollY={scrollY} />
      <Footer />
    </div>
  );
} 