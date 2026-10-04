"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ComponentProps, useRef } from "react";

type NavigationIntentLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export default function NavigationIntentLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...rest
}: NavigationIntentLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetchedHref = useRef<string | undefined>(undefined);

  const prefetchOnIntent = () => {
    const destinationPath = href.split(/[?#]/, 1)[0];
    if (destinationPath === pathname || prefetchedHref.current === href) return;

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
        prefetchOnIntent();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        prefetchOnIntent();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        prefetchOnIntent();
      }}
    />
  );
}
