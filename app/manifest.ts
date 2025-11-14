import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pastaa - Secure Text Sharing',
    short_name: 'Pastaa',
    description: 'Share text securely with end-to-end encryption',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#facc15',
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

