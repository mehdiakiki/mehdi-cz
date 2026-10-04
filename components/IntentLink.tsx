"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useRef, type ComponentProps } from "react";

type IntentLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

const IntentLink = ({ href, onMouseEnter, onFocus, onTouchStart, ...rest }: IntentLinkProps) => {
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
};

export default IntentLink;
