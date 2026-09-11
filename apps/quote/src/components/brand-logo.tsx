import styles from './brand-logo.module.css';

type Props = {
  variant?: 'dark' | 'light';
  compact?: boolean;
  className?: string;
};

export function MaksterQuoteLogo({ variant = 'dark', compact = false, className = '' }: Props) {
  const isLight = variant === 'light';
  const ink = isLight ? '#fff6ef' : '#251912';
  const copper = isLight ? '#e2a16f' : '#b46f43';
  const copperDark = isLight ? '#b96f42' : '#8e5232';

  return (
    <span className={`${styles.logo} ${isLight ? styles.light : ''} ${compact ? styles.compact : ''} ${className}`} aria-label="Makster Quote">
      <svg className={styles.mark} viewBox="0 0 48 48" role="img" aria-hidden="true">
        <path d="M5 36V13.8L13.7 8l8.2 6.8L30 8l7 4.9v7.3l-7-4.9-8.1 6.8-8.2-6.8V36z" fill={ink}/>
        <path d="M13.7 8 21.9 14.8 30 8l-8.1-3.8z" fill={copper} opacity=".92"/>
        <path d="M30 8v20.2l7 5V12.9z" fill={copperDark}/>
        <path d="M30 20.2h12.5V36H30z" fill={copper}/>
        <path d="M34.5 24.5H40v7h-5.5z" fill={isLight ? '#2a1c15' : '#fff4e8'} opacity=".95"/>
        <path d="M39.5 34.5 44 39l-2.3 2.3-4.5-4.5z" fill={copperDark}/>
        <path d="M5 13.8 13.7 8v7.3L5 21z" fill={isLight ? '#d5c3b5' : '#4b3428'} opacity=".78"/>
      </svg>
      <span className={styles.wordmark}>
        <strong>Makster</strong>
        <small>Quote</small>
      </span>
    </span>
  );
}
