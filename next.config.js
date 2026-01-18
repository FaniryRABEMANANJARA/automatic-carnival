/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pour Vercel, on peut utiliser des variables d'environnement
  env: {
    DATABASE_PATH: process.env.DATABASE_PATH || './data/budget.json',
  },
}

module.exports = nextConfig
