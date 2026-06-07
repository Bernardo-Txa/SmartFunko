"use client";

import Image from "next/image";
import { useState } from "react";
import { clsx } from "clsx";
import { ProductArtwork } from "@/components/product/product-card";
import { SafeProductImage } from "@/components/product/safe-product-image";
import type { Product } from "@/types/product";

export function ProductGallery({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <div>
      {selectedImage ? (
        <SafeProductImage
          src={selectedImage}
          alt={product.imageAlt ?? product.name}
          fallback={<ProductArtwork product={product} />}
          priority
          sizes="(min-width: 1024px) 42vw, 100vw"
        />
      ) : (
        <ProductArtwork product={product} />
      )}

      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((imageUrl, index) => (
            <button
              key={imageUrl}
              type="button"
              onClick={() => setSelectedImage(imageUrl)}
              className={clsx(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-slate-950/50",
                selectedImage === imageUrl ? "border-[var(--accent)]" : "border-[var(--border)]",
              )}
              aria-label={`Ver imagem ${index + 1} de ${product.name}`}
            >
              <Image
                src={imageUrl}
                alt={`${product.imageAlt ?? product.name} ${index + 1}`}
                fill
                sizes="80px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

