import Link from 'next/link';
import styles from './premium-polish.module.css';

const audiences = [
  ['01 / SOLO','Один мебельщик','Быстро считать проект без параллельной жизни в Excel.',['Свой Price Book','True Cost по проекту','PDF для клиента']],
  ['02 / WORKSHOP','Мастерская','Держать расчёт, версии и коммерцию в одном рабочем процессе.',['Единые правила расчёта','История проекта','Makster Pro-ready']],
  ['03 / ATELIER','Команда','Подготовить основу для ролей, общей базы цен и производственной цепочки.',['Несколько пользователей','Командный Price Book','Расширенные интеграции']],
];

const pilotSteps = [
  ['01','Настройте Price Book','Заведите свои основные материалы, фурнитуру, работу и операции.'],
  ['02','Возьмите реальный проект','Лучше не учебный пример, а кухню или шкаф, который вы действительно считаете.'],
  ['03','Сравните результат','Проверьте себестоимость, маржу и итоговую цену против привычного процесса.'],
  ['04','Решите, что оставить','Пилот нужен не для красивой демо-версии, а чтобы проверить Quote на вашей мастерской.'],
];

export function ConversionSuite() {
  return (
    <section className={styles.conversion} id="for-whom">
      <div className={styles.conversionHead}>
        <div>
          <span className={styles.eyebrow}>BUILT FOR REAL WORKSHOPS</span>
          <h2>Один инструмент — для разных масштабов мебельного бизнеса.</h2>
        </div>
        <p>Makster Quote начинается с простой задачи: быстро и точно посчитать реальный заказ. Но архитектура сразу рассчитана на рост — от одного мастера до команды и производственного контура.</p>
      </div>

      <div className={styles.audienceGrid}>
        {audiences.map(([label,title,text,items]) => (
          <article className={styles.audienceCard} key={label as string}>
            <span>{label as string}</span>
            <h3>{title as string}</h3>
            <p>{text as string}</p>
            <ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        ))}
      </div>

      <div className={styles.pilotPanel}>
        <div>
          <span className={styles.eyebrow}>CLOSED PILOT</span>
          <h3>Проверяйте Quote не на презентации, а на своём заказе.</h3>
          <p>Наша цель на пилоте — не убедить вас словами, а показать, где Makster экономит шаги и где расчёт становится прозрачнее.</p>
          <Link href="/login" className={styles.pilotAction}>Запустить пилот на реальном проекте →</Link>
        </div>
        <div className={styles.pilotSteps}>
          {pilotSteps.map(([n,title,text]) => (
            <article key={n}>
              <span>{n}</span>
              <b>{title}</b>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.trustBar} aria-label="Принципы Makster Quote">
        <div><small>PRICE LOGIC</small><b>Ваши закупочные цены</b></div>
        <div><small>NO FAKE DATA</small><b>Без вымышленных цен</b></div>
        <div><small>FURNITURE FIRST</small><b>Расчёт вокруг конструкции</b></div>
        <div><small>OUTPUT</small><b>Готовое предложение клиенту</b></div>
      </div>
    </section>
  );
}
