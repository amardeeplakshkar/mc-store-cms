import { ActionForm, Submit } from '@/components/form';
import { LoginCard } from '@/components/shell';
import { Field } from '@/components/ui';
import { loginAction } from '../actions';

export default async function Login({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <LoginCard title="Store admin" subtitle={`Sign in to manage ${slug}`}>
      <ActionForm action={loginAction.bind(null, slug)}>
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <Submit>Sign in</Submit>
      </ActionForm>
    </LoginCard>
  );
}
