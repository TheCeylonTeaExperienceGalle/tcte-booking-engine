"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold,
        rootMargin: "50px 0px -50px 0px",
      }
    );

    const node = ref.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
      observer.disconnect();
    };
  }, [threshold]);

  return [ref, isVisible];
}

export function ScrollAnimateWrapper({
  children,
  className = "",
  animation = "animate-fade-in-up",
  delay = 0,
}) {
  const [ref, isVisible] = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`${className} ${
        isVisible ? animation : "opacity-0 translate-y-8"
      }`}
      style={{
        transitionDelay: isVisible ? `${delay}ms` : "0ms",
        transitionDuration: "800ms",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {children}
    </div>
  );
}
