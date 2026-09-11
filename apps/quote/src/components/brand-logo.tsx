import styles from './brand-logo.module.css';

type Props = {
  variant?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
};

export function MaksterQuoteLogo({ variant = 'dark', compact = false, className = '' }: Props) {
  const isLight = variant === 'light';
  const ink = isLight ? '#fff4e9' : '#2a170f';
  const dark = isLight ? '#e8c7ad' : '#3a2117';
  const copper = isLight ? '#e9ae79' : '#b86e3e';
  const brass = isLight ? '#f4cfaa' : '#d79a66';
  const panel = isLight ? '#352218' : '#f6eadf';

  return (
    <span className={`${styles.logo} ${isLight ? styles.light : ''} ${compact ? styles.compact : ''} ${className}`} aria-label="Makster Quote">
      <svg className={styles.mark} viewBox="0 0 72 58" role="img" aria-hidden="true">
        <path d="M4 45V17L19 8l14 10v28l-9 5V27l-7-5v24z" fill={ink}/>
        <path d="M19 8 33 18 47 9 32 3z" fill={brass}/>
        <path d="M33 18 47 9v9L33 27z" fill={copper}/>
        <path d="M47 9 67 20v28L47 56z" fill={dark}/>
        <path d="M50 18h13v9H50zM50 29h13v9H50zM50 40h13v9H50z" fill={brass}/>
        <path d="M54 22h5v1.8h-5zM54 33h5v1.8h-5zM54 44h5v1.8h-5z" fill={panel}/>
        <path d="M33 27 47 18v38l-14-10z" fill={copper} opacity=".92"/>
        <path d="M4 17 19 8v9L4 26z" fill={dark} opacity=".88"/>
      </svg>
      <span className={styles.wordmark}>
        <strong>Makster</strong>
        <small>Quote</small>
      </span>
    </span>
  );
}
