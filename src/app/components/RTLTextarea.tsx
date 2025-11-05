'use client';

import { useRef, useEffect, useCallback } from 'react';

interface RTLTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export default function RTLTextarea({ value, onChange, ...props }: RTLTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setupRTL = useCallback((textarea: HTMLTextAreaElement) => {
    // Force RTL attributes and styles immediately
    textarea.setAttribute('dir', 'rtl');
    textarea.setAttribute('lang', 'ar');
    textarea.style.direction = 'rtl';
    textarea.style.textAlign = 'right';
    textarea.style.unicodeBidi = 'embed';
    
    // Force RTL on input
    const handleInput = () => {
      textarea.style.direction = 'rtl';
      textarea.style.textAlign = 'right';
      textarea.style.unicodeBidi = 'embed';
    };
    
    textarea.addEventListener('input', handleInput);
    
    // Store cleanup function
    cleanupRef.current = () => {
      textarea.removeEventListener('input', handleInput);
    };
  }, []);

  // Use callback ref to ensure RTL is set when element is attached
  const setTextareaRef = useCallback((textarea: HTMLTextAreaElement | null) => {
    // Clean up previous listener if it exists
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    
    textareaRef.current = textarea;
    if (textarea) {
      setupRTL(textarea);
    }
  }, [setupRTL]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.setAttribute('dir', 'rtl');
    target.setAttribute('lang', 'ar');
    target.style.direction = 'rtl';
    target.style.textAlign = 'right';
    target.style.unicodeBidi = 'embed';
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.setAttribute('dir', 'rtl');
    target.setAttribute('lang', 'ar');
    target.style.direction = 'rtl';
    target.style.textAlign = 'right';
    target.style.unicodeBidi = 'embed';
  };

  return (
    <textarea
      ref={setTextareaRef}
      value={value}
      onChange={onChange}
      onFocus={handleFocus}
      onInput={handleInput}
      dir="rtl"
      lang="ar"
      style={{
        textAlign: 'right',
        direction: 'rtl',
        unicodeBidi: 'embed',
        ...props.style
      }}
      {...props}
    />
  );
}

