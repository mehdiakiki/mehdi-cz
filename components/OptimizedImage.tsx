import Image from "@/components/Image";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  preload?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  preload = false,
  quality = 75,
  sizes,
  fill = false,
}: OptimizedImageProps) {
  const loadingPolicy = preload ? ({ preload: true } as const) : ({ loading: "lazy" } as const);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      quality={quality}
      sizes={sizes}
      fill={fill}
      {...loadingPolicy}
    />
  );
}
