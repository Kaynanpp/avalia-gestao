import Link from 'next/link';
import { PRODUCT } from '@/lib/product';

export function ProductLogo() {
  return <Link href={PRODUCT.paths.home} className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label={`${PRODUCT.name} — início`}>
    <svg viewBox="0 0 40 40" width="36" height="36" fill="none" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#9a3412" /><path d="M10 28V21M20 28V15M30 28V9" stroke="#fff7ed" strokeWidth="4" strokeLinecap="round" /><path d="M10 13L16 9" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" /></svg>
    <span className="text-lg">{PRODUCT.name}</span>
  </Link>;
}
