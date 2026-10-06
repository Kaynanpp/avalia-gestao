import type { MetadataRoute } from 'next';
import { productPublication } from '@/lib/product';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const { siteUrl, indexable } = productPublication();
  return indexable ? { rules: { userAgent: '*', allow: '/produto', disallow: ['/admin', '/api', '/avaliar', '/avaliar-colega', '/autoavaliar', '/sucesso', '/autoavaliacao-info', '/$'] }, sitemap: `${siteUrl}/sitemap.xml` } : { rules: { userAgent: '*', disallow: '/' } };
}
