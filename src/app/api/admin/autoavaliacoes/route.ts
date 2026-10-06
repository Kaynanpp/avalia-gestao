import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function retiredResponse() {
  return NextResponse.json(
    { success: false, error: 'A autoavaliação foi encerrada. Utilize a área Avaliação de colegas para os novos convites. Os registros antigos foram preservados.' },
    { status: 410 }
  );
}

export async function GET() { return retiredResponse(); }
export async function POST() { return retiredResponse(); }

