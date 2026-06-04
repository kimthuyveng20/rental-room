import { redirect } from 'next/navigation';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/src/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);
  console.log("sess", session);
  if (session) {
    redirect('/dashboard');
  }

  redirect('/login');
}
