import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/login`,
            { email: credentials.email, password: credentials.password },
          );
          if (data.accessToken) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
              role: data.user.role,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            };
          }
        } catch {
          return null;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.role = (user as { role?: string }).role;
        token.sub = (user as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.role = token.role as string;
      if (token.sub) session.user.id = token.sub as string;
      return session;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};
