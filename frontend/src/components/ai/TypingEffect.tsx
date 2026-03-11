'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TypingEffectProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    className?: string;
}

export default function TypingEffect({ text, speed = 15, onComplete, className = '' }: TypingEffectProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const indexRef = useRef(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        // Reset when text changes
        setDisplayedText('');
        setIsComplete(false);
        indexRef.current = 0;

        const typeText = () => {
            if (indexRef.current < text.length) {
                // Add more characters per step for faster typing
                const chunkSize = text.length > 100 ? 3 : text.length > 50 ? 2 : 1;
                const nextIndex = Math.min(indexRef.current + chunkSize, text.length);
                setDisplayedText(text.slice(0, nextIndex));
                indexRef.current = nextIndex;
                rafRef.current = requestAnimationFrame(typeText);
            } else {
                setIsComplete(true);
                onComplete?.();
            }
        };

        // Start typing after a small delay
        rafRef.current = requestAnimationFrame(typeText);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [text, onComplete]);

    return (
        <span className={className}>
            {displayedText}
            {!isComplete && <span className="typing-cursor" />}
        </span>
    );
}
