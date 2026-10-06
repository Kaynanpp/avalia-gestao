'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PeerCodeEntry() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  return <form className="mt-6 space-y-3" onSubmit={(event) => { event.preventDefault(); const value = code.trim().split('/').pop() || ''; if (!/^[A-Za-z0-9_-]{32}$/.test(value)) { setError('Confira o código ou cole o link completo recebido do RH.'); return; } router.push(`/avaliar-colega/${value}`); }}><label htmlFor="peer-code" className="block text-sm font-semibold text-slate-700">Código ou link da avaliação</label><input id="peer-code" value={code} onChange={(event) => { setCode(event.target.value); setError(''); }} required maxLength={500} autoComplete="off" spellCheck={false} className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm" />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700">Abrir avaliação</button></form>;
}
