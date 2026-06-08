"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type Props = {
  alt: string;
  aspectClassName?: string;
  fallback: ReactNode;
  imageClassName?: string;
  priority?: boolean;
  sizes: string;
  src: string;
};

export function SafeProductImage({
  alt,
  aspectClassName = "aspect-[4/5]",
  fallback,
  imageClassName = "p-4 sm:p-5",
  priority = false,
  sizes,
  src,
}: Props) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback;
  }

  return (
    <div className={`relative flex ${aspectClassName} w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#f8fafc] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06),inset_0_-14px_28px_rgba(15,23,42,0.03)]`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={72}
        sizes={sizes}
        className={`object-contain ${imageClassName}`}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
