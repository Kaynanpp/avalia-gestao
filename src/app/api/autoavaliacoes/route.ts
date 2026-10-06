import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'A autoavaliação foi encerrada. Para avaliar um colega do setor, solicite um novo convite ao RH/DP.' },
    { status: 410 }
  );
}

