import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Makster Quote',
    short_name: 'Quote',
    description: 'Furniture costing, margins and customer proposals for workshops.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffaf5',
    theme_color: '#2b1d16',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
