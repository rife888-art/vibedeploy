import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
    accessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    githubId?: string
    dbUserId?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, email, name, password_hash')
          .eq('email', credentials.email.toLowerCase().trim())
          .single()

        if (!user || !user.password_hash) return null

        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'github') {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('github_id', account.providerAccountId)
          .single()

        if (!existing) {
          await supabaseAdmin.from('users').insert({
            github_id: account.providerAccountId,
            email: user.email,
            plan: 'free',
          })
        }
      }
      return true
    },
    async jwt({ token, account, user }) {
      if (account?.provider === 'github') {
        token.accessToken = account.access_token
        token.githubId = account.providerAccountId
      }
      // For credentials login, store db user id directly
      if (account?.provider === 'credentials' && user) {
        token.dbUserId = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Credentials user — id is already the DB id
      if (token.dbUserId) {
        session.user.id = token.dbUserId
      }
      // GitHub user — look up by github_id
      else if (token.githubId) {
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('github_id', token.githubId)
          .single()

        if (dbUser) {
          session.user.id = dbUser.id
        }
      }

      session.accessToken = token.accessToken
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
}
