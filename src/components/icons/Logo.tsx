import type { SVGProps } from 'react';

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="hsl(var(--primary))" />
    <path d="M12 11h4" stroke="hsl(var(--primary-foreground))" />
    <path d="M12 11v4" stroke="hsl(var(--primary-foreground))" />
    <path d="M12 11H8" stroke="hsl(var(--primary-foreground))" />
    <path d="M12 11V7" stroke="hsl(var(--primary-foreground))" />
  </svg>
);

export default Logo;
