'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

interface VoicePlayerProps {
    text: string;
    messageId: number;
}

export default function VoicePlayer({ text, messageId }: VoicePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { primaryColor } = useThemeStore();

    const handlePlay = useCallback(async () => {
        // Stop if already playing
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setIsPlaying(false);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/v1/voice/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.slice(0, 2000) }), // Limit for API
            });

            if (!response.ok) {
                const err = await response.json();
                console.warn('Voice synthesis unavailable:', err.detail);
                setIsLoading(false);
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
            };

            audio.onerror = () => {
                setIsPlaying(false);
                setIsLoading(false);
            };

            await audio.play();
            setIsPlaying(true);
        } catch (err) {
            console.warn('Voice synthesis error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isPlaying, text]);

    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlay}
            className="p-1.5 rounded-lg transition-all hover:bg-white/5"
            style={{ color: isPlaying ? primaryColor : undefined }}
            title={isPlaying ? 'Hentikan' : 'Dengarkan'}
        >
            {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
            ) : isPlaying ? (
                <VolumeX className="w-3.5 h-3.5" style={{ color: primaryColor }} />
            ) : (
                <Volume2 className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
            )}
        </motion.button>
    );
}
