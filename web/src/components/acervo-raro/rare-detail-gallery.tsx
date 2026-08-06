"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { SafeProductImage } from "@/components/product/safe-product-image";
import { RareImageFallback } from "@/components/acervo-raro/rare-image-fallback";

type GalleryImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
};

type Props = {
  coverImageUrl?: string | null;
  images: GalleryImage[];
  title: string;
};

export function RareDetailGallery({ coverImageUrl, images, title }: Props) {
  const gallery = useMemo(() => {
    const seen = new Set<string>();
    return [coverImageUrl, ...images.map((image) => image.imageUrl)]
      .filter((imageUrl): imageUrl is string => Boolean(imageUrl))
      .filter((imageUrl) => {
        if (seen.has(imageUrl)) {
          return false;
        }

        seen.add(imageUrl);
        return true;
      });
  }, [coverImageUrl, images]);
  const [selectedImage, setSelectedImage] = useState(gallery[0]);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  return (
    <div>
      <div className="relative rounded-lg border border-amber-200/20 bg-slate-950/64 p-3 shadow-[0_28px_80px_rgba(2,6,23,0.32)]">
        {selectedImage ? (
          <SafeProductImage
            src={selectedImage}
            alt={title}
            fallback={<RareImageFallback />}
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            imageClassName="p-5 transition duration-300 hover:scale-[1.025]"
          />
        ) : (
          <RareImageFallback />
        )}
        {selectedImage ? (
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            className="absolute bottom-5 right-5 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/14 bg-slate-950/78 px-4 text-sm font-black text-[var(--foreground)] backdrop-blur hover:bg-slate-900"
          >
            <Maximize2 size={16} aria-hidden="true" />
            Zoom
          </button>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {gallery.map((imageUrl, index) => (
            <button
              key={imageUrl}
              type="button"
              onClick={() => setSelectedImage(imageUrl)}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-amber-200/18 bg-white transition hover:border-amber-100"
              aria-label={`Ver imagem ${index + 1} de ${title}`}
            >
              <Image
                src={imageUrl}
                alt={`${title} ${index + 1}`}
                fill
                sizes="80px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}

      {isZoomOpen && selectedImage ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/92 p-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/16 bg-slate-950 text-white"
          >
            <X size={20} aria-hidden="true" />
            <span className="sr-only">Fechar zoom</span>
          </button>
          <div className="relative h-[min(82svh,760px)] w-[min(92vw,1100px)] rounded-lg border border-amber-200/18 bg-white">
            <Image
              src={selectedImage}
              alt={title}
              fill
              sizes="92vw"
              className="object-contain p-4"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
