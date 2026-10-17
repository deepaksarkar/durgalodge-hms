// src/app/login/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LoginForm } from '@/components/auth/login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const session = await getSession()
  if (session?.userId) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
