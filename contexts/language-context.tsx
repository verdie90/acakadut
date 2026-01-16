"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import idTranslations from "@/lib/translations/id.json";
import enTranslations from "@/lib/translations/en.json";

type Language = "id" | "en";
type TranslationValue = string | Record<string, unknown>;
type Translations = Record<string, TranslationValue>;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations: Record<Language, Translations> = {
    id: idTranslations as Translations,
    en: enTranslations as Translations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("en");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLanguage = localStorage.getItem("language") as Language;
        if (savedLanguage && (savedLanguage === "id" || savedLanguage === "en")) {
            setLanguageState(savedLanguage);
        } else {
            // Detect browser language
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith("id")) {
                setLanguageState("id");
            }
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    }, []);

    const t = useCallback(
        (key: string): string => {
            const keys = key.split(".");
            let value: TranslationValue = translations[language];

            for (const k of keys) {
                if (value && typeof value === "object" && k in value) {
                    value = (value as Record<string, TranslationValue>)[k];
                } else {
                    return key; // Return key if translation not found
                }
            }

            return typeof value === "string" ? value : key;
        },
        [language]
    );

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <LanguageContext.Provider value={{ language: "en", setLanguage, t: (key) => key }}>
                {children}
            </LanguageContext.Provider>
        );
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
