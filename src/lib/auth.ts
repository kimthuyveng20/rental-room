import NextAuth, { type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";

import { users } from "@/src/lib/db/schema";
import { getDb } from "./db";


// Module Augmentation to make TypeScript aware of custom fields
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string; 
      role: "admin" | "owner" | "tenant";
      name: string;
      email: string;
    };
  }
  interface User {
    id: string; 
    role: "admin" | "owner" | "tenant";
    name: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "owner" | "tenant";
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }
        const db = getDb();
        // 1. Fetch user safely
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });

        // 2. Early return if user is not found to prevent runtime crash
        if (!user) {
          throw new Error("Invalid credentials");
        }

        // 3. Compare passwords safely now that user is guaranteed to exist
        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // 4. Return user object (converting number ID to string for NextAuth compatibility)
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };