// Authentication Service
// V1: SHA-256 hash via expo-crypto
// Production upgrade: Replace with Argon2id (react-native-argon2) or bcrypt
// Password NEVER stored in plaintext

import * as Crypto from 'expo-crypto';
import { getAdminByUsername, logAdminLogin } from './DatabaseService';

export type AuthResult = {
  success: boolean;
  adminId?: number;
  username?: string;
  error?: string;
};

// Hash password using SHA-256 (V1 placeholder)
// TODO: Replace with Argon2id — npm install react-native-argon2
export async function hashPassword(password: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return `SHA256:${hash}`;
}

export async function verifyPassword(
  plaintext: string,
  storedHash: string
): Promise<boolean> {
  try {
    // Handle mock hash (first-run seeded admin)
    if (storedHash.startsWith('MOCK_HASH_')) {
      // Extract embedded plaintext for mock (dev only)
      const mockPw = storedHash.replace('MOCK_HASH_', '').replace('_REPLACE_WITH_ARGON2ID', '');
      return plaintext === mockPw;
    }

    if (storedHash.startsWith('SHA256:')) {
      const inputHash = await hashPassword(plaintext);
      return inputHash === storedHash;
    }

    return false;
  } catch {
    return false;
  }
}

export async function loginAdmin(
  username: string,
  password: string,
  photoPath?: string
): Promise<AuthResult> {
  try {
    if (!username.trim() || !password.trim()) {
      return { success: false, error: 'Username and password required' };
    }

    const admin = await getAdminByUsername(username.trim().toLowerCase());

    if (!admin) {
      await logAdminLogin(null, 'failed', photoPath);
      return { success: false, error: 'Invalid username or password' };
    }

    const valid = await verifyPassword(password, admin.password_hash);

    if (!valid) {
      await logAdminLogin(admin.id, 'failed', photoPath);
      return { success: false, error: 'Invalid username or password' };
    }

    await logAdminLogin(admin.id, 'success', photoPath);
    return { success: true, adminId: admin.id, username: admin.username };
  } catch (error: any) {
    return { success: false, error: 'Login system error. Please try again.' };
  }
}

export async function changeAdminPassword(
  adminId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { getDatabase } = await import('./DatabaseService');
    const db = await getDatabase();
    const hash = await hashPassword(newPassword);
    await db.runAsync('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, adminId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
}
