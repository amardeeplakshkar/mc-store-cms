import { ActionForm, Submit } from '@/components/form';
import { LoginCard } from '@/components/shell';
import { Field } from '@/components/ui';
import { loginAction } from '../actions';

export default function Login() {
  return (
    <LoginCard title="Platform admin" subtitle="Sign in to manage all stores">
      <ActionForm action={loginAction}>
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <Submit>Sign in</Submit>
      </ActionForm>
    </LoginCard>
  );
}
