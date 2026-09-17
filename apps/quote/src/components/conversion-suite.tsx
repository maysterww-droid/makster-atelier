import Link from 'next/link';
import styles from './premium-polish.module.css';

const audiences = [
  ['01 / SOLO','Один мебельщик',['Свой Price Book','True Cost','PDF клиенту']],
  ['02 / WORKSHOP','Мастерская',['Единые правила','История проекта','Makster Pro-ready']],
  ['03 / ATELIER','Команда',['Роли и доступы','Общая база цен','Интеграции']],
];

const pilotSteps = [
  ['01','Свои цены'],
  ['02','Реальный проект'],
  ['03','Сравнение расчёта'],
  ['04','Решение по пилоту'],
];

export function ConversionSuite() {
  return (
    <section className={styles.conversion} id="for-whom">
      <div className={styles.conversionHead}>
        <div>
          <span className={styles.eyebrow}>BUILT FOR REAL WORKSHOPS</span>
          <h2>От одного мастера — до мастерской.</h2>
        </div>
      </div>

      <div className={styles.audienceGrid}>
        {audiences.map(([label,title,items]) => (
          <article className={styles.audienceCard} key={label as string}>
            <span>{label as string}</span>
            <h3>{title as string}</h3>
            <ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </div>

      <div className={styles.pilotPanel}>
        <div>
          <span className={styles.eyebrow}>CLOSED PILOT</span>
          <h3>Проверьте Quote на своём заказе.</h3>
          <Link href="/login" className={styles.pilotAction}>Запустить пилот →</Link>
        </div>
        <div className={styles.pilotSteps}>
          {pilotSteps.map(([n,title]) => (
            <article key={n}>
              <span>{n}</span>
              <b>{title}</b>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.trustBar} aria-label="Принципы Makster Quote">
        <div><small>PRICE LOGIC</small><b>Ваши цены</b></div>
        <div><small>TRUE COST</small><b>Реальная себестоимость</b></div>
        <div><small>FURNITURE FIRST</small><b>Расчёт из конструкции</b></div>
        <div><small>OUTPUT</small><b>PDF клиенту</b></div>
      </div>
    </section>
  );
}
