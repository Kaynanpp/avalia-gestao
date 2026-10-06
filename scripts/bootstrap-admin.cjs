const { randomBytes } = require('node:crypto');
const { loadEnvConfig } = require('@next/env');
const { cert, deleteApp, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

loadEnvConfig(process.cwd());

function isStrongPassword(password) {
  return password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

async function bootstrapAdmin() {
  if (process.env.BOOTSTRAP_ADMIN_ALLOW !== 'true') {
    throw new Error('A criação inicial exige BOOTSTRAP_ADMIN_ALLOW=true.');
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    `${randomBytes(3).toString('base64url')}Aa1!`;
  if (!email || !name || !isStrongPassword(password)) {
    throw new Error('Defina BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME e uma senha temporária forte (8+ caracteres, maiúscula, minúscula, número e símbolo).');
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Defina o ID do projeto Firebase.');

  const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= `${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1'}:${process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8080'}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= `${process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || '127.0.0.1'}:${process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099'}`;
    initializeApp({ projectId });
  } else {
    // Do not let stale local emulator settings redirect production Admin SDK calls.
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey) throw new Error('As credenciais do Firebase Admin não estão configuradas.');
    initializeApp({
      projectId,
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const existingAdmins = await db.collection('users')
    .where('role', '==', 'ADMIN')
    .where('active', '==', true)
    .limit(1)
    .get();
  if (!existingAdmins.empty) {
    throw new Error('Já existe um administrador ativo. Use a área Usuários para criar outras contas.');
  }

  try {
    await auth.getUserByEmail(email);
    throw new Error('Este e-mail já existe no Firebase Auth. Escolha um e-mail novo ou regularize a conta existente manualmente.');
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }

  const createdAt = new Date();
  const user = await auth.createUser({ email, password, displayName: name });
  try {
    await auth.setCustomUserClaims(user.uid, { role: 'ADMIN', name });
    await db.collection('users').doc(user.uid).set({
      id: user.uid,
      email,
      name,
      role: 'ADMIN',
      active: true,
      mustChangePassword: true,
      createdAt,
      updatedAt: createdAt,
    });
  } catch (error) {
    await auth.deleteUser(user.uid).catch(() => undefined);
    throw error;
  }

  console.log(`Administrador inicial criado: ${email}`);
  console.log('No primeiro acesso, a pessoa precisará substituir a senha temporária.');
  console.log(`Senha temporária (exibida uma vez): ${password}`);
}

bootstrapAdmin()
  .catch((error) => {
    console.error('Não foi possível criar o administrador inicial:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });
