export const DEFAULT_PEER_CRITERIA = [
  { id: 'collaboration', name: 'Colaboração', description: 'Ajuda os colegas e contribui para o trabalho em equipe.' },
  { id: 'respect', name: 'Respeito', description: 'Trata as pessoas com respeito, educação e consideração.' },
  { id: 'communication', name: 'Comunicação', description: 'Compartilha informações com clareza e escuta os colegas.' },
  { id: 'responsibility', name: 'Responsabilidade', description: 'Cumpre os combinados, os horários e os cuidados de segurança.' },
  { id: 'quality', name: 'Qualidade do trabalho', description: 'Executa suas atividades com atenção e cuidado.' },
] as const;

export type PeerCriterion = { id: string; name: string; description: string };
export type PeerScores = Record<string, number>;
export type Coworker = {
  id: string; name: string; registration: string; position: string;
  departmentId: string; departmentName: string; active: boolean;
};
export type PeerDepartment = { id: string; name: string; active: boolean };
export type PeerPeriod = { id: string; name: string; status: string; startDate: string; endDate: string };
export type PeerLink = { id: string; coworkerName: string; departmentName: string; periodName: string; status: string; expiresAt: string };
export type GeneratedPeerLink = PeerLink & { token: string };
export type PeerImportRow = {
  line: number; name: string; registration: string; position: string;
  departmentId: string; departmentName: string; error?: string;
};
export type PeerReportRow = {
  coworkerId: string; coworkerName: string; departmentName: string; count: number;
  average: number | null; scores: PeerScores | null; comments: string[];
};
export type PeerReport = { minimum: number; criteria: PeerCriterion[]; rows: PeerReportRow[]; total: number };
export type PublicPeerContext = {
  availableCoworkers: number;
  departments: PeerDepartment[];
  period: { id: string; name: string } | null;
  criteria: PeerCriterion[];
  commentsEnabled: boolean;
};

export type PeerAccessContext = {
  participationToken: string;
  evaluatorName: string;
  departmentName: string;
  coworkers: Coworker[];
  period: { id: string; name: string };
  criteria: PeerCriterion[];
  commentsEnabled: boolean;
};

export const normalizePeerName = (value: string) => value.trim().normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
export const normalizeRegistration = (value: string) => value.trim().normalize('NFKC').toLocaleUpperCase('pt-BR').replace(/[^A-Z0-9._-]/g, '');

/** CSV dialect used by the browser and by Excel exports: one person per line. */
export function parsePeerImport(text: string, departments: PeerDepartment[], existing: Coworker[] = []): PeerImportRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((value, index) => ({ value: value.trim(), line: index + 1 })).filter((entry) => entry.value);
  if (lines.length > 501) throw new Error('Importe no máximo 500 pessoas por vez.');
  const seenNames = new Set(existing.map((person) => `${person.departmentId}:${normalizePeerName(person.name)}`));
  const seenRegistrations = new Set(existing.map((person) => normalizeRegistration(person.registration)).filter(Boolean));
  const rows: PeerImportRow[] = [];
  for (const entry of lines) {
    const delimiter = entry.value.includes('\t') ? '\t' : entry.value.includes(';') ? ';' : ',';
    const fields: string[] = [];
    let value = '', quoted = false;
    for (let index = 0; index < entry.value.length; index++) {
      const character = entry.value[index];
      if (character === '"') {
        if (quoted && entry.value[index + 1] === '"') { value += '"'; index++; }
        else quoted = !quoted;
      } else if (character === delimiter && !quoted) { fields.push(value.trim()); value = ''; }
      else value += character;
    }
    fields.push(value.trim());
    if (!rows.length && normalizePeerName(fields[0]) === 'nome' && ['matricula', 'matrícula', 'registration'].includes(normalizePeerName(fields[1] || ''))) continue;
    const [name = '', rawRegistration = '', departmentName = '', position = ''] = fields;
    const registration = normalizeRegistration(rawRegistration);
    const matching = departments.filter((department) => department.active && (normalizePeerName(department.name) === normalizePeerName(departmentName) || department.id === departmentName));
    const department = matching.length === 1 ? matching[0] : undefined;
    let error: string | undefined;
    if (quoted || fields.length !== 4) error = 'Use quatro colunas: nome;matrícula;setor;cargo/função.';
    else if (name.length < 2 || name.length > 120) error = 'Nome vazio ou fora do limite de 120 caracteres.';
    else if (!registration) error = 'Matrícula obrigatória ou com caracteres inválidos.';
    else if (rawRegistration.length > 40) error = 'A matrícula deve ter no máximo 40 caracteres.';
    else if (!department) error = 'Setor ativo não encontrado ou nome de setor ambíguo.';
    else if (position.length < 2 || position.length > 120) error = 'Cargo/função obrigatório, com até 120 caracteres.';
    else if (seenRegistrations.has(registration)) error = 'Matrícula duplicada no arquivo ou já cadastrada.';
    else if (seenNames.has(`${department.id}:${normalizePeerName(name)}`)) error = 'Já existe uma pessoa com este nome neste setor, no cadastro ou no arquivo.';
    if (registration) seenRegistrations.add(registration);
    if (department) seenNames.add(`${department.id}:${normalizePeerName(name)}`);
    rows.push({
      line: entry.line, name, registration, position,
      departmentId: department?.id || '', departmentName: department?.name || departmentName,
      ...(error ? { error } : {}),
    });
  }
  if (rows.length > 500) throw new Error('Importe no máximo 500 pessoas por vez.');
  if (!rows.length) throw new Error('Informe pelo menos uma pessoa.');
  return rows;
}
