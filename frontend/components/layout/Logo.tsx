import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

/**
 * The header lockup: icon mark + 10px + wordmark, as two separate assets.
 *
 * The assets are never merged, redesigned, or substituted. The combined mark
 * (qelvix-lockup.png) is forbidden here and belongs only to the footer brand
 * block. In dark theme both marks are inverted to white via CSS filter — the
 * source PNGs are never edited or duplicated as white variants.
 *
 * Wrapped in a single link with one accessible name so the brand is not
 * announced twice.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Qelvix, home"
      className={cn(
        'flex items-center rounded-sm transition-opacity duration-fast ease-standard hover:opacity-80',
        className,
      )}
    >
      <Image
        src="/brand/qelvix-icon.png"
        alt=""
        aria-hidden
        width={764}
        height={764}
        priority
        className="h-6 w-6 md:h-7 md:w-7 dark:invert"
      />
      <Image
        src="/brand/qelvix-wordmark.png"
        alt=""
        aria-hidden
        width={1051}
        height={349}
        priority
        className="ml-[10px] h-4 w-auto md:h-[19px] dark:invert"
      />
    </Link>
  );
}
