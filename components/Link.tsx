import type { LinkProps } from "next/link";
import { AnchorHTMLAttributes } from "react";
import IntentLink from "./IntentLink";

const CustomLink = ({
  href,
  children,
  ...rest
}: LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const isInternalLink = href && href.startsWith("/");
  const isAnchorLink = href && href.startsWith("#");

  if (isInternalLink) {
    return (
      <IntentLink className="break-words" href={href} {...rest}>
        {children}
      </IntentLink>
    );
  }

  if (isAnchorLink) {
    return (
      <a className="break-words" href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a className="break-words" target="_blank" rel="noopener noreferrer" href={href} {...rest}>
      {children}
    </a>
  );
};

export default CustomLink;
