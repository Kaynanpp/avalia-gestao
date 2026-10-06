import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PRODUCT, COMPANY_BRAND } from '@/lib/product';

interface BrandLogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  compact?: boolean;
}

export function BrandLogo({ href = '/', className, imageClassName, priority = false, compact = false }: BrandLogoProps) {
  const logo = COMPANY_BRAND.generic ? (
    <span className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white p-2 text-slate-900 ring-1 ring-black/5 dark:bg-slate-900 dark:text-white', className)}>
      <Image src="/brand/avalia-gestao.svg" alt="" width={40} height={40} priority={priority} />
      {!compact && <span className="text-sm font-semibold leading-tight">{PRODUCT.name}<span className="mt-1 block text-xs font-normal">{COMPANY_BRAND.name}</span></span>}
    </span>
  ) : (
    <span className={cn('inline-flex shrink-0 overflow-hidden rounded-lg bg-[#f4f4f4] ring-1 ring-black/5', compact ? 'aspect-square' : 'aspect-[849/280]', className)}>
      <Image
        src={compact ? '/brand/atalaia-mark.png' : '/brand/atalaia-wordmark.png'}
        alt={compact ? '' : 'Atalaia Alimentos'}
        width={compact ? 144 : 849}
        height={compact ? 127 : 280}
        priority={priority}
        className={cn('h-full w-full object-contain', imageClassName)}
        sizes={compact ? '48px' : '(max-width: 640px) 180px, 240px'}
      />
    </span>
  );

  return href ? <Link href={href} aria-label={`${COMPANY_BRAND.generic ? PRODUCT.name : COMPANY_BRAND.name} — início`}>{logo}</Link> : logo;
}
