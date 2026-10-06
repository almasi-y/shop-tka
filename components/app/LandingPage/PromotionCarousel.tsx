"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { ACTIVE_PROMOTIONS_QUERY_RESULT } from "@/sanity.types";

type Promotion = ACTIVE_PROMOTIONS_QUERY_RESULT[number];

function getYouTubeVideoId(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");
    let id: string | null = null;

    if (hostname === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      id = url.searchParams.get("v");
      if (!id) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (parts[0] === "embed" || parts[0] === "shorts") {
          id = parts[1] ?? null;
        }
      }
    }

    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function PromotionImage({
  promotion,
  eager,
}: {
  promotion: Promotion;
  eager: boolean;
}) {
  const imageUrl = promotion.image?.asset?.url;
  if (!imageUrl) return null;

  const image = (
    <Image
      src={imageUrl}
      alt={promotion.image?.alt ?? promotion.internalTitle ?? "Promotion"}
      fill
      className="object-cover"
      sizes="(max-width: 1024px) 100vw, 70vw"
      loading={eager ? "eager" : "lazy"}
      placeholder={promotion.image?.asset?.metadata?.lqip ? "blur" : "empty"}
      blurDataURL={promotion.image?.asset?.metadata?.lqip ?? undefined}
    />
  );

  if (!promotion.destinationUrl) return image;

  if (promotion.destinationUrl.startsWith("/")) {
    return (
      <Link
        href={promotion.destinationUrl}
        className="absolute inset-0"
        aria-label={promotion.internalTitle ?? "Open promotion"}
      >
        {image}
      </Link>
    );
  }

  return (
    <a
      href={promotion.destinationUrl}
      className="absolute inset-0"
      aria-label={promotion.internalTitle ?? "Open promotion"}
    >
      {image}
    </a>
  );
}

function PromotionSlide({
  promotion,
  eager,
}: {
  promotion: Promotion;
  eager: boolean;
}) {
  const videoId = getYouTubeVideoId(promotion.youtubeUrl);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl md:h-[400px] lg:h-[420px]">
      {promotion.mediaType === "youtube" && videoId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&loop=1&playlist=${videoId}&playsinline=1&rel=0`}
          title={promotion.internalTitle ?? "Promotional video"}
          className="h-full w-full rounded-xl border-0"
          loading={eager ? "eager" : "lazy"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <PromotionImage promotion={promotion} eager={eager} />
      )}
    </div>
  );
}

export function PromotionCarousel({
  promotions,
}: {
  promotions: ACTIVE_PROMOTIONS_QUERY_RESULT;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const count = promotions.length;
  const plugins = useMemo(
    () =>
      count > 1
        ? [
            Autoplay({
              delay: 8000,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
            }),
          ]
        : [],
    [count],
  );

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", handleSelect);
    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index),
    [api],
  );

  if (count === 0) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <Carousel
        setApi={setApi}
        opts={{ loop: count > 1, align: "start" }}
        plugins={plugins}
        className="w-full overflow-hidden rounded-xl"
      >
        <CarouselContent className="-ml-0">
          {promotions.map((promotion, index) => (
            <CarouselItem
              key={promotion._id}
              className="overflow-hidden rounded-xl pl-0"
            >
              <PromotionSlide promotion={promotion} eager={index === 0} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {count > 1 && (
          <>
            <CarouselPrevious className="left-4 border-zinc-700 bg-zinc-800/80 text-white hover:bg-zinc-700 hover:text-white sm:left-8" />
            <CarouselNext className="right-4 border-zinc-700 bg-zinc-800/80 text-white hover:bg-zinc-700 hover:text-white sm:right-8" />
          </>
        )}
      </Carousel>

      {count > 1 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-6">
          {promotions.map((promotion, index) => (
            <button
              key={promotion._id}
              type="button"
              onClick={() => scrollTo(index)}
              className={cn(
                "pointer-events-auto h-2 w-2 rounded-full transition-all duration-300",
                current === index
                  ? "w-6 bg-white"
                  : "bg-white/40 hover:bg-white/60",
              )}
              aria-label={`Go to promotion ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
