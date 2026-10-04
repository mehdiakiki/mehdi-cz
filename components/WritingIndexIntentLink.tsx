"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

type WritingIndexIntentLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export default function WritingIndexIntentLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...rest
}: WritingIndexIntentLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedHref = useRef<string | undefined>(undefined);

  const prefetch = () => {
    const destination = href.split(/[?#]/, 1)[0];

    if (destination === pathname || prefetchedHref.current === href) return;

    prefetchedHref.current = href;
    router.prefetch(href);
  };

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        prefetch();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetch();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetch();
      }}
    />
  );
}
