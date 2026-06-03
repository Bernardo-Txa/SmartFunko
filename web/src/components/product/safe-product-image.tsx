"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type Props = {
  alt: string;
  fallback: ReactNode;
  priority?: boolean;
  sizes: string;
  src: string;
};

export function SafeProductImage({ alt, fallback, priority = false, sizes, src }: Props) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback;
  }

  return (
    <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[14px] bg-slate-50 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={72}
        sizes={sizes}
        className="object-contain p-4"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
