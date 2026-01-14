import { create } from 'zustand';
import React, { useState, useRef, useEffect } from 'react';

// --- STORE ---
interface SliderStore {
    value: number;
    setValue: (v: number) => void;
}

const useSliderStore = create<SliderStore>((set) => ({
    value: 50,
    setValue: (v: number) => set({ value: v }),
}));

// --- COMPONENTS ---

export const CheeseSizeSlider: React.FC = () => {
    const value = useSliderStore((state) => state.value);
    const setValue = useSliderStore((state) => state.setValue);

    return (
        <div style={{ marginBottom: '1rem' }}>
            <input 
                type="range" 
                min="10" 
                max="100" 
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
            />
            <span style={{ marginLeft: '0.5rem' }}>Size: {value}</span>
        </div>
    );
};

export const CheeseSizeValue: React.FC = () => {
    const value = useSliderStore((state) => state.value);
    return <strong>{value}</strong>;
};

export const CheeseCanvas: React.FC = () => {
    const value = useSliderStore((state) => state.value);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const img = useRef<HTMLImageElement | null>(null);

    // Precargar la imagen una vez
    useEffect(() => {
        const image = new Image();
        image.src = "/note-logos/512/tresviso-wedge.png";
        img.current = image;
        image.onload = () => {
            draw();
        };
    }, []);

    function draw() {
        const canvas = canvasRef.current;
        if (!canvas || !img.current) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!img.current.complete) return;

        const size = Math.min(value * 2, 200);
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;

        ctx.drawImage(img.current, x, y, size, size);
    }

    // Redibuja cada vez que cambia el valor
    useEffect(() => {
        draw();
    }, [value]);

    return (
        <canvas
            ref={canvasRef}
            width={200}
            height={200}
            style={{
                display: "block", 
                marginTop: "10px", 
                marginLeft: "auto", 
                marginRight: "auto",
            }}
        ></canvas>
    );
};
