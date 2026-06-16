import NextAuth, { type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Adapter } from "next-auth/adapters"; 
import { users } from "@/src/lib/db/schema";
import { getDb } from "./db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string; 
      role: "admin" | "owner" | "tenant";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    id: string; 
    role: "admin" | "owner" | "tenant";
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "owner" | "tenant";
  }
}

const db = getDb();

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as Adapter,
  
  providers: [
    // GOOGLE PROVIDER
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, 
    }),

    // CREDENTIALS PROVIDER
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

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        // Security check: Make sure they verified their code before letting them log in!
        // Assuming your verify route changes a column like `emailVerified` or `isVerified`
        if (!user.emailVerified) {
          throw new Error("Please verify your email code before logging in.");
        }

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as "admin" | "owner" | "tenant",
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "tenant";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
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