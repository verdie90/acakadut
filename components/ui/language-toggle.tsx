"use client";

import * as React from "react";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

export function LanguageToggle() {
    const { language, setLanguage } = useLanguage();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Languages className="h-5 w-5" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => setLanguage("id")}
                    className={`gap-2 ${language === "id" ? "bg-accent" : ""}`}
                >
                    <span className="text-lg">🇮🇩</span>
                    <span>Bahasa Indonesia</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage("en")}
                    className={`gap-2 ${language === "en" ? "bg-accent" : ""}`}
                >
                    <span className="text-lg">🇺🇸</span>
                    <span>English</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
