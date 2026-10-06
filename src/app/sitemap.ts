import type { MetadataRoute } from 'next';
import { PRODUCT, productPublication } from '@/lib/product';
import guides from '@/content/public-guides.json';
export const dynamic = 'force-dynamic';
export default function sitemap(): MetadataRoute.Sitemap {
  const { siteUrl, indexable } = productPublication();
  if (!siteUrl || !indexable) return [];
  return [...Object.values(PRODUCT.paths), ...guides.map((guide) => `${PRODUCT.paths.docs}/${guide.slug}`)].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: 'monthly', priority: path === PRODUCT.paths.home ? 1 : 0.6 }));
}
