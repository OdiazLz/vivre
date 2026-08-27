import bcrypt from 'bcrypt';
import { config } from '../config/index.js';
import { createSuperAdmin, findAdminIdentityByEmail } from '../repositories/adminRepository.js';

export async function bootstrapSuperAdmin() {
  const email = config.superadmin.email.trim().toLowerCase();
  const password = config.superadmin.password;
  if (!password) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('SUPERADMIN_EMAIL no es válido.');
  const existing = await findAdminIdentityByEmail(email);
  if (existing) {
    if (existing.rol !== 'SUPERADMIN') throw new Error('SUPERADMIN_EMAIL pertenece a una cuenta de condominio y no puede promoverse automáticamente.');
    return;
  }
  if (password.length < 14 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error('SUPERADMIN_PASSWORD debe tener entre 14 y 128 caracteres, mayúscula, minúscula, número y símbolo.');
  const hash = await bcrypt.hash(password, 12);
  await createSuperAdmin(email,hash);
  console.log('Cuenta SUPERADMIN creada correctamente. Retira SUPERADMIN_PASSWORD del entorno y reinicia.');
}
