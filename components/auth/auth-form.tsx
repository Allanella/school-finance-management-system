'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, GraduationCap, LoaderCircle } from 'lucide-react'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { schoolTypes, schoolTypeLabels, type SchoolType } from '@/lib/school/types'

type AuthFormProps = { initialError?: string }

function authErrorMessage(code: string | undefined, status: number | undefined) {
  if (code === 'email_not_confirmed') {
    return 'Confirm your email from the message we sent before signing in.'
  }
  if (code === 'invalid_credentials' || code === 'user_not_found') {
    return 'Invalid email or password.'
  }
  if (status === 429 || code?.includes('rate_limit')) {
    return 'Too many attempts. Wait a little and try again.'
  }
  return 'We could not sign you in right now. Please try again.'
}

export function AuthForm({ initialError }: AuthFormProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    initialError
      ? {
          kind: 'error',
          text:
            initialError === 'workspace'
              ? 'This account does not have a school workspace yet. Ask a school administrator for access.'
              : 'We could not complete sign in. Please try again.',
        }
      : null,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFeedback(null)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const supabase = createClient()

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setFeedback({ kind: 'error', text: authErrorMessage(error.code, error.status) })
          setPending(false)
          return
        }
        router.replace('/dashboard')
        router.refresh()
        return
      }

      const schoolName = String(formData.get('school_name') ?? '').trim()
      const schoolType = String(formData.get('school_type') ?? 'primary') as SchoolType
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: {
            school_name: schoolName,
            school_type: schoolType,
            country_code: 'UG',
            currency_code: 'UGX',
          },
        },
      })

      if (error) {
        const text =
          error.code === 'weak_password'
            ? 'Choose a stronger password with at least 8 characters.'
            : error.status === 429 || error.code?.includes('rate_limit')
              ? 'Too many attempts. Wait a little and try again.'
              : 'We could not create the account. If you already registered, sign in instead.'
        setFeedback({ kind: 'error', text })
        setPending(false)
        return
      }

      if (data.session) {
        router.replace('/dashboard')
        router.refresh()
        return
      }

      setFeedback({
        kind: 'success',
        text: 'Check your email to confirm your account. Your school workspace will be ready after confirmation.',
      })
      setPending(false)
    } catch {
      setFeedback({ kind: 'error', text: 'A connection issue interrupted the request. Please try again.' })
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">SchoolFinance</p>
            <p className="text-sm text-muted-foreground">School finance workspace</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your school account'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in to manage your school’s finance and enrolment.'
              : 'Start with your school details. You can customize levels and streams later.'}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1" role="group" aria-label="Account access">
          <button
            type="button"
            aria-pressed={mode === 'signin'}
            onClick={() => {
              setMode('signin')
              setFeedback(null)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            aria-pressed={mode === 'signup'}
            onClick={() => {
              setMode('signup')
              setFeedback(null)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Register school
          </button>
        </div>

        {feedback ? (
          <div
            role={feedback.kind === 'error' ? 'alert' : 'status'}
            className={`mb-5 rounded-lg border px-3 py-2.5 text-sm ${feedback.kind === 'error' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5 text-foreground'}`}
          >
            {feedback.text}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <FieldGroup className="gap-4">
            {mode === 'signup' ? (
              <>
                <Field>
                  <FieldLabel htmlFor="school_name">School name</FieldLabel>
                  <Input id="school_name" name="school_name" required minLength={2} maxLength={160} autoComplete="organization" placeholder="e.g. Kampala Community School" className="h-10" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="school_type">School type</FieldLabel>
                  <select id="school_type" name="school_type" defaultValue="primary" className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    {schoolTypes.map((schoolType) => <option key={schoolType} value={schoolType}>{schoolTypeLabels[schoolType]}</option>)}
                  </select>
                  <FieldDescription>Primary and secondary levels are starting templates, not fixed requirements.</FieldDescription>
                </Field>
              </>
            ) : null}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="name@school.org" className="h-10" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="At least 8 characters"
                className="h-10"
              />
            </Field>
          </FieldGroup>
          <button
            type="submit"
            disabled={pending}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {mode === 'signin' ? 'Sign in' : 'Create school account'}
            {!pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          New accounts use UGX by default. School levels, classes, and academic periods can be configured after sign in.
        </p>
      </section>
    </main>
  )
}
