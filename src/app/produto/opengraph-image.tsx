import { ImageResponse } from 'next/og';
import { PRODUCT } from '@/lib/product';
export const alt = 'Avalia Gestão — avaliações de lideranças e colegas';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function SocialImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#faf8f5', padding: 70, color: '#0f172a', borderLeft: '24px solid #9a3412' }}><div style={{ display: 'flex', fontSize: 38, fontWeight: 700 }}>{PRODUCT.name}</div><div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, fontWeight: 700, lineHeight: 1.15 }}><span>Ouça a equipe.</span><span style={{ color: '#9a3412' }}>Dê direção ao desenvolvimento.</span></div><div style={{ display: 'flex', fontSize: 25 }}>Lideranças e colegas · Participação por setor · Resultados para o RH</div></div>, size);
}
