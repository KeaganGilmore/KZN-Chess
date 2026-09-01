import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/admin/',
        '/auth',
        '/my-orders',
        '/my-tournaments',
        '/store/cart',
        '/store/checkout',
        '/store/orders/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
