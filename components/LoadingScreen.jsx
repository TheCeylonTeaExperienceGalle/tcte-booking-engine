"use client";

import { useState, useEffect } from "react";

export default function LoadingScreen({ duration = 2000, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
          }, 500);
          return 100;
        }
        return prev + 1;
      });
    }, duration / 100);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80 z-50 flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float morph" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float morph" style={{animationDelay: '2s'}} />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/15 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse-glow" style={{animationDelay: '1s'}} />
      </div>

      <div className="text-center text-white relative z-10">
        {/* Logo Animation */}
        <div className="mb-8 animate-bounce-in">
          <div className="text-6xl mb-4 animate-pulse-glow">🍃</div>
          <h1 className="text-4xl font-serif font-bold mb-2 gradient-text bg-gradient-to-r from-white to-secondary bg-clip-text text-transparent typewriter">
            Tea Tourism
          </h1>
          <p className="text-lg opacity-90 animate-fade-in-up" style={{animationDelay: '1s'}}>
            Brewing Excellence...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-secondary to-white rounded-full transition-all duration-100 ease-out shimmer"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-2 opacity-80 neon-glow">{progress}%</p>
        </div>

        {/* Loading Animation */}
        <div className="loading-dots mt-6">
          <span></span>
          <span></span>
          <span style={{background: 'white'}}></span>
        </div>
      </div>
    </div>
  );
}