import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPool } from './db-postgres-pg'

// JWT_SECRET doit être défini dans les variables d'environnement
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET doit être défini dans les variables d\'environnement pour des raisons de sécurité')
}

// TypeScript assertion : JWT_SECRET est maintenant garanti d'être défini
const JWT_SECRET_FINAL: string = JWT_SECRET
const JWT_EXPIRES_IN = '7d'

export interface User {
  id: number
  email: string
  name: string | null
  created_at: string
}

export interface UserWithPassword extends User {
  password: string
}

// Créer un nouvel utilisateur
export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const pool = getPool()
  
  // Vérifier si l'utilisateur existe déjà
  const { rows: existingUsers } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  )
  
  if (existingUsers.length > 0) {
    throw new Error('Un utilisateur avec cet email existe déjà')
  }
  
  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Insérer l'utilisateur
  const { rows } = await pool.query(
    `INSERT INTO users (email, password, name) 
     VALUES ($1, $2, $3) 
     RETURNING id, email, name, created_at`,
    [email.toLowerCase(), hashedPassword, name || null]
  )
  
  return {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    created_at: rows[0].created_at,
  }
}

// Vérifier les identifiants de connexion
export async function verifyUser(email: string, password: string): Promise<User | null> {
  const pool = getPool()
  
  const { rows } = await pool.query(
    'SELECT id, email, password, name, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  )
  
  if (rows.length === 0) {
    return null
  }
  
  const user = rows[0]
  
  // Vérifier le mot de passe
  const isValid = await bcrypt.compare(password, user.password)
  
  if (!isValid) {
    return null
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
  }
}

// Générer un token JWT
export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET_FINAL,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Vérifier un token JWT
export function verifyToken(token: string): { id: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET_FINAL) as { id: number; email: string }
    return decoded
  } catch (error) {
    return null
  }
}

// Obtenir un utilisateur par ID
export async function getUserById(id: number): Promise<User | null> {
  const pool = getPool()
  
  const { rows } = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [id]
  )
  
  if (rows.length === 0) {
    return null
  }
  
  return {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    created_at: rows[0].created_at,
  }
}
