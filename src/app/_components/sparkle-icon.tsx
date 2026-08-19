import type { SVGProps } from "react";

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" {...props}>
      <path d="M12 2.5c.4 3.2 1.1 5.3 2.2 6.5 1.2 1.2 3.3 1.9 6.5 2.3-3.2.4-5.3 1.1-6.5 2.3-1.1 1.2-1.8 3.3-2.2 6.5-.4-3.2-1.1-5.3-2.3-6.5-1.2-1.2-3.3-1.9-6.4-2.3 3.1-.4 5.2-1.1 6.4-2.3 1.2-1.2 1.9-3.3 2.3-6.5z" />
    </svg>
  );
}
