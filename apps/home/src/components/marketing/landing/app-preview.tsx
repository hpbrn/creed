import Image from "next/image";

export function AppPreview() {
  return (
    <section aria-label="App preview" className="px-6 pb-8 md:px-10">
      <div
        role="img"
        aria-label="Creed showing a personal context file with its sections and editing controls"
        className="mx-auto grid max-w-[1120px] overflow-hidden rounded-2xl"
      >
        {(["light", "dark"] as const).map((theme) => {
          const path = `/preview-${theme}`;
          return (
            <picture
              key={theme}
              className={`col-start-1 row-start-1 block ${theme === "light" ? "opacity-100 dark:opacity-0" : "opacity-0 dark:opacity-100"}`}
            >
              <source
                type="image/webp"
                srcSet={`${path}-1200.webp 1200w, ${path}-2400.webp 2400w, ${path}.webp 3600w`}
                sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1200px) calc(100vw - 80px), 1120px"
              />
              <Image
                src={`${path}.webp`}
                alt=""
                width={3600}
                height={2148}
                unoptimized
                loading="eager"
                decoding="sync"
                className="h-auto w-full"
              />
            </picture>
          );
        })}
      </div>
    </section>
  );
}
