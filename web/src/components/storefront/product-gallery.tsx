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
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-2 shadow-[0_24px_64px_rgba(2,6,23,0.24)]">
          <SafeProductImage
            src={selectedImage}
            alt={product.imageAlt ?? product.name}
            fallback={<ProductArtwork product={product} />}
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
          />
        </div>
      ) : (
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-2 shadow-[0_24px_64px_rgba(2,6,23,0.24)]">
          <ProductArtwork product={product} />
        </div>
      )}

      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((imageUrl, index) => (
            <button
              key={imageUrl}
              type="button"
              onClick={() => setSelectedImage(imageUrl)}
              className={clsx(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-[#f8fafc] transition",
                selectedImage === imageUrl
                  ? "border-cyan-200 shadow-[0_0_0_2px_rgba(34,211,238,0.18)]"
                  : "border-white/15 hover:border-cyan-200/50",
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
