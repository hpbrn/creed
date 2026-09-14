import type { AnchorHTMLAttributes } from "react";
import { useAppNavigate } from "@/components/creed/app-navigation";
export default function Link({
  href,
  prefetch: _prefetch,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
}) {
  const navigate = useAppNavigate();
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && href.startsWith("/")) {
          event.preventDefault();
          navigate(href);
        }
      }}
    />
  );
}
