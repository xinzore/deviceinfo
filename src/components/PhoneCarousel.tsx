import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Card } from './ui/card';
import { cn } from './ui/utils';

interface PhoneCarouselProps {
  images: {
    src: string;
    alt: string;
    color: string;
  }[];
  variant?: 'default' | 'compact';
  className?: string;
  compactSize?: { width: number; height: number };
  onImageClick?: (index: number) => void;
}

export function PhoneCarousel({
  images,
  variant = 'default',
  className,
  compactSize = { width: 100, height: 150 },
  onImageClick,
}: PhoneCarouselProps) {
  const isCompact = variant === 'compact';
  const compactStyle = isCompact ? { maxWidth: compactSize.width, minWidth: compactSize.width } : undefined;
  return (
    <Carousel
      className={cn(
        isCompact ? 'w-full max-w-none' : 'w-full max-w-md mx-auto',
        className,
      )}
      style={compactStyle}
    >
      <CarouselContent>
        {images.map((image, index) => (
          <CarouselItem key={index}>
            <Card
              className={cn('bg-white/5 backdrop-blur-xl border-white/10', isCompact ? 'p-2' : 'p-8')}
              style={{ display: 'contents' }}
            >
              <div
                className={cn('relative', isCompact ? 'flex items-center justify-center' : undefined)}
                style={isCompact ? { height: compactSize.height } : undefined}
              >
                {/* Glow effect */}
                {!isCompact && (
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-purple-500/10 to-transparent blur-3xl"></div>
                )}

                {/* Phone image */}
                <button
                  type="button"
                  className="relative cursor-zoom-in focus:outline-none"
                  onClick={() => onImageClick?.(index)}
                >
                  <ImageWithFallback
                    src={image.src}
                    alt={image.alt}
                    className={cn('w-full', isCompact ? 'object-contain' : 'drop-shadow-2xl')}
                    style={isCompact ? { maxHeight: compactSize.height } : undefined}
                    unsplashQuery="smartphone black premium"
                  />
                </button>

                {/* Color badge */}
                {!isCompact && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full">
                      <p className="text-xs text-white/80">{image.color}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      {!isCompact && (
        <>
          <CarouselPrevious className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10" />
          <CarouselNext className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10" />
        </>
      )}
    </Carousel>
  );
}
