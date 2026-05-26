import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      role?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    role?: string;
  }
}
