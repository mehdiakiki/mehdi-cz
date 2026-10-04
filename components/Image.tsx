import NextImage, { getImageProps, ImageProps } from "next/image";
import { preload as preloadResource } from "react-dom";
import { getBlurDataURL } from "@/data/blurPlaceholders";

const basePath = process.env.BASE_PATH;

type BaseImageProps = Omit<
  ImageProps,
  "alt" | "blurDataURL" | "fetchPriority" | "loading" | "placeholder" | "preload" | "priority"
> & {
  alt: string;
  blur?: boolean;
  blurDataURL?: string;
  quality?: number;
};

type ImageLoadingPolicy =
  | {
      preload: true;
      fetchPriority?: never;
      loading?: never;
      preloadMedia?: never;
    }
  | {
      preload?: false;
      fetchPriority?: ImageProps["fetchPriority"];
      loading?: "lazy" | "eager";
      preloadMedia?: never;
    }
  | {
      preload?: false;
      fetchPriority: "high";
      loading?: "lazy";
      /**
       * Emit an exact responsive-image preload only when this media query matches.
       * Keep this opt-in: callers must first verify that the image is near the
       * initial viewport for the matching layout.
       */
      preloadMedia: string;
    };

type OptimizedImageProps = BaseImageProps & ImageLoadingPolicy;

const Image = ({
  src,
  alt,
  blur = false,
  blurDataURL: providedBlurDataURL,
  loading = "lazy",
  quality = 75,
  preload = false,
  preloadMedia,
  fetchPriority,
  className = "",
  sizes,
  ...rest
}: OptimizedImageProps) => {
  const imageSrc = typeof src === "string" && src.startsWith("/") ? `${basePath || ""}${src}` : src;
  const sourcePath = typeof src === "string" ? src : "default" in src ? src.default.src : src.src;
  const blurDataURL = blur ? providedBlurDataURL || getBlurDataURL(sourcePath) : undefined;
  const imageProps: ImageProps = {
    src: imageSrc,
    alt,
    ...(preload ? { preload: true } : { loading }),
    quality,
    ...(sizes ? { sizes } : {}),
    placeholder: blurDataURL ? "blur" : "empty",
    blurDataURL: blurDataURL || undefined,
    fetchPriority,
    className,
    ...rest,
  };

  if (preloadMedia) {
    const { props } = getImageProps(imageProps);
    preloadResource(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
      fetchPriority: "high",
      media: preloadMedia,
    });
  }

  return <NextImage {...imageProps} />;
};

export default Image;
