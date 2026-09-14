import type { ImgHTMLAttributes } from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number;
};

export default function Image({
  src,
  alt = "",
  fill,
  priority,
  unoptimized: _unoptimized,
  quality: _quality,
  style,
  ...props
}: ImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      src={typeof src === "string" ? src : src.src}
      loading={priority ? "eager" : props.loading}
      style={
        fill
          ? {
              position: "absolute",
              width: "100%",
              height: "100%",
              inset: 0,
              ...style,
            }
          : style
      }
    />
  );
}
