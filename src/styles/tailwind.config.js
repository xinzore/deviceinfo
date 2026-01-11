import React, { useState, useEffect, useRef } from 'react';

const AutoScrollText = ({ children, className = "" }) => {
    const [isOverflowing, setIsOverflowing] = useState(false);
    const containerRef = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current && textRef.current) {
                // Metin genişliği kapsayıcıdan büyükse true döner
                setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
            }
        };

        checkOverflow();
        // Pencere boyutu değişirse tekrar kontrol et
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [children]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden whitespace-nowrap ${className}`}
        >
            <div
                ref={textRef}
                className={`inline-block ${isOverflowing ? 'animate-marquee flex' : ''}`}
            >
                {/* Ana Metin */}
                <span className={isOverflowing ? "mr-8" : ""}>
                    {children}
                </span>

                {/* Sadece taşıyorsa görünecek kopya metin (Döngü için) */}
                {isOverflowing && (
                    <span>{children}</span>
                )}
            </div>
        </div>
    );
};

export default AutoScrollText;