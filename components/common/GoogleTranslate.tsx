'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { useUIContext } from '@/context/UIContext';

declare global {
  interface Window {
    google?: {
      translate: {
        TranslateElement: {
          new (options: unknown, elementId: string): unknown;
          InlineLayout: {
            SIMPLE: number;
          };
        };
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

export const GoogleTranslate: React.FC = () => {
  const { language } = useUIContext();

  useEffect(() => {
    // Register Google Translate Init Callback
    window.googleTranslateElementInit = () => {
      try {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,as,hi,bn',
              autoDisplay: false,
            },
            'google_translate_element'
          );
        }
      } catch (e) {
        console.warn('Google Translate Init error:', e);
      }
    };

    // If script is already loaded
    if (window.google?.translate) {
      window.googleTranslateElementInit();
    }
  }, []);

  // Whenever language changes, trigger Google Translate synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const targetLang = language;
      const cookieValue = targetLang === 'en' ? '/en/en' : `/en/${targetLang}`;
      
      // Update google translation cookie
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;

      // Trigger the Google Translate select element if present
      const triggerSelect = () => {
        const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
        if (select) {
          if (select.value !== targetLang) {
            select.value = targetLang;
            select.dispatchEvent(new Event('change'));
          }
          return true;
        }
        return false;
      };

      if (!triggerSelect()) {
        const timer = setTimeout(triggerSelect, 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Could not sync Google Translate combo:', e);
    }
  }, [language]);

  return (
    <>
      <div id="google_translate_element" className="hidden" style={{ display: 'none' }} />
      <Script
        id="google-translate-script"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </>
  );
};
