import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/site';

export const runtime = 'edge';
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#15141d',
          color: '#F5F0EB',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          <span style={{ color: '#E2A03F' }}>KZN</span>
          <span style={{ marginLeft: 24 }}>Chess</span>
        </div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 34, color: '#c9c4d8' }}>
          Every Tournament, One Place
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 56,
            width: 360,
            height: 10,
            borderRadius: 6,
            background: 'linear-gradient(90deg, #E2A03F, #1ABC9C)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
