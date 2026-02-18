import NextImage, { ImageProps } from "next/image";

const basePath = process.env.BASE_PATH;

interface OptimizedImageProps extends Omit<ImageProps, "alt"> {
  alt: string; // Make alt required for accessibility
  loading?: "lazy" | "eager";
  quality?: number;
  priority?: boolean;
}

const Image = ({
  src,
  alt,
  loading = "lazy",
  quality = 75,
  priority = false,
  className = "",
  ...rest
}: OptimizedImageProps) => {
  // Handle external URLs vs local paths
  const imageSrc = src?.toString().startsWith("http") ? src : `${basePath || ""}${src}`;

  return (
    <NextImage
      src={imageSrc}
      alt={alt}
      {...(!priority && { loading })}
      quality={quality}
      priority={priority}
      className={`${className} transition-opacity duration-300`}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyEQZHbFFFirsVgGFfhGWMcDFFFB4qy2qCAyMR1XBRRQR/9k="
      {...rest}
    />
  );
};

export default Image;
