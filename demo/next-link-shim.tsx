import React from "react";

export function Link({ href, children, onClick, ...props }: any) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!e.defaultPrevented && (href?.startsWith("/") || href?.startsWith("?"))) {
      e.preventDefault();
      window.history.pushState({}, "", href);
      window.dispatchEvent(new Event("popstate"));
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export default Link;
