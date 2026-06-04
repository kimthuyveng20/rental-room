import NextAuth from "next-auth";
import { authOptions } from "@/src/lib/auth"; // Import your config safely

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };