import { login, signup } from './actions';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

const errors: Record<string, string> = {
  missing: 'Введите email и пароль.',
  invalid: 'Не удалось войти. Проверьте email и пароль.',
  password: 'Пароль должен содержать минимум 8 символов.',
  signup: 'Не удалось создать аккаунт. Попробуйте ещё раз.',
};

export default async function LoginPage({ searchParams }: Props) {
  const query = await searchParams;

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authBrand"><span className="brandMark">M</span><div><strong>Makster</strong><small>Quote</small></div></div>
        <h1>Расчёт мебели без гадания</h1>
        <p className="muted">Войдите или создайте аккаунт, чтобы считать реальные проекты своей мастерской.</p>

        {query.error ? <div className="notice error">{errors[query.error] ?? 'Произошла ошибка.'}</div> : null}
        {query.message === 'check-email' ? <div className="notice success">Проверьте почту и подтвердите регистрацию. После подтверждения вернитесь в Makster Quote.</div> : null}

        <form className="stackForm">
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Пароль<input name="password" type="password" minLength={8} autoComplete="current-password" required /></label>
          <button className="primary wide" formAction={login}>Войти</button>
          <button className="secondary wide" formAction={signup}>Создать аккаунт</button>
        </form>

        <p className="finePrint">Русский — основной язык для текущего тестирования. Английский остаётся системным fallback.</p>
      </section>
    </main>
  );
}
