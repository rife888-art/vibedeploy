import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import GithubProvider from 'next-auth/providers/github'
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
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
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
            name: user.name,
            plan: 'free',
          })
        }
      }
      return true
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.githubId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      if (token.githubId) {
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
  pages: {
    signIn: '/auth/signin',
  },
}
