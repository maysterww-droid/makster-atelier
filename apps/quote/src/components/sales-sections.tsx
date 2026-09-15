import Link from 'next/link';
import styles from './sales-sections.module.css';

export function SalesCapabilities() {
  return (
    <section id="features" className={styles.capabilities}>
      <header className={styles.capHead}>
        <span>MAKSTER QUOTE / В РАБОТЕ</span>
        <h2>Собрали мебель.<br/><em>Увидели деньги.</em></h2>
      </header>

      <div className={styles.moneyMachine}>
        <div className={styles.projectSide}>
          <div className={styles.projectTop}>
            <span>КОНСТРУКЦИЯ</span>
            <b>Kitchen Praha · 8 модулей</b>
          </div>
          <div className={styles.cabinetScene} aria-label="Схема мебельного проекта">
            <i className={styles.tall}/>
            <i className={styles.base}/>
            <i className={styles.drawer}/>
            <i className={styles.base}/>
            <div className={styles.worktop}/>
            <strong>3 640 mm</strong>
          </div>
          <div className={styles.materialLine}>
            <span>EGGER U702</span><b>1 780 Kč</b><span>BLUM</span><b>1 190 Kč</b>
          </div>
        </div>

        <div className={styles.arrowPulse}><i>→</i></div>

        <div className={styles.resultSide}>
          <div className={styles.costResult}>
            <small>TRUE COST</small>
            <strong>128 460 Kč</strong>
            <div><span>Маржа</span><b>34.8%</b></div>
          </div>
          <div className={styles.clientResult}>
            <small>ЦЕНА КЛИЕНТУ</small>
            <strong>196 900 Kč</strong>
            <div><span>PDF готов</span><b>✓</b></div>
          </div>
        </div>
      </div>

      <div className={styles.capBands}>
        <article><span>01</span><div><small>TRUE COST</small><h3>Понимаете, на чём зарабатываете.</h3></div><b>Материалы · фурнитура · работа</b></article>
        <article><span>02</span><div><small>YOUR PRICE BOOK</small><h3>Считаете по своим закупочным ценам.</h3></div><b>Без «средней цены из интернета»</b></article>
        <article><span>03</span><div><small>CLIENT OUTPUT</small><h3>Отправляете цену, а не Excel.</h3></div><b>Готовое предложение клиенту</b></article>
      </div>
    </section>
  );
}

export function SalesAudience() {
  return (
    <section id="for-whom" className={styles.audience}>
      <header className={styles.audienceHead}>
        <span>ДЛЯ КОГО</span>
        <h2>От одного мастера — <em>до команды.</em></h2>
      </header>

      <div className={styles.scaleRail}>
        <article><span>01 / SOLO</span><h3>Один мебельщик</h3><strong>Считать быстрее.</strong><p>Price Book · True Cost · PDF</p></article>
        <article><span>02 / WORKSHOP</span><h3>Мастерская</h3><strong>Считать одинаково.</strong><p>Единые правила · история проекта</p></article>
        <article><span>03 / ATELIER</span><h3>Команда</h3><strong>Считать вместе.</strong><p>Роли · общая база цен · Makster Pro</p></article>
      </div>

      <div className={styles.pilotHero}>
        <div className={styles.pilotCopy}><span>FREE PILOT</span><h3>Возьмите один<br/><em>реальный заказ.</em></h3><p>Не презентацию. Вашу кухню, шкаф или гардеробную.</p></div>
        <div className={styles.pilotPrice}><small>FREE PILOT</small><strong>€0</strong><span>проверка Makster Quote на реальной работе</span></div>
        <Link href="/login" className={styles.pilotButton}>Запустить Quote <b>→</b></Link>
        <div className={styles.pilotTrack}><span><b>01</b> Свои цены</span><i>→</i><span><b>02</b> Реальный проект</span><i>→</i><span><b>03</b> Сравнение</span><i>→</i><span><b>04</b> Решение</span></div>
      </div>
    </section>
  );
}

export function SalesPricing() {
  return (
    <section id="pricing" className={styles.pricing}>
      <header className={styles.pricingHead}>
        <span>PRICING</span>
        <h2>Сначала проверьте Quote.<br/><em>Потом масштабируйте.</em></h2>
      </header>

      <div className={styles.pricingMain}>
        <div className={styles.pilotOffer}>
          <span>FREE PILOT</span>
          <strong>€0</strong>
          <h3>Проверьте Quote на реальном проекте.</h3>
          <p>Базовый проект · Price Book · True Cost · preview</p>
          <Link href="/login">Начать пилот <b>→</b></Link>
        </div>

        <div className={styles.futurePlans}>
          <article>
            <span>STARTER</span>
            <h3>Для одного мебельщика</h3>
            <strong>€9 / месяц</strong>
            <p>Проекты · клиенты · полная библиотека · себестоимость · PDF · отправка предложения</p>
          </article>
          <article>
            <span>WORKSHOP</span>
            <h3>Для мастерской</h3>
            <strong>€29 / месяц</strong>
            <p>До 5 пользователей · общие цены · история изменений · расширенные шаблоны</p>
          </article>
          <article>
            <span>ATELIER</span>
            <h3>Для команды</h3>
            <strong>€79 / месяц</strong>
            <p>До 15 пользователей · роли · несколько рабочих пространств · Makster Pro · priority support</p>
          </article>
        </div>
      </div>
      <p className={styles.pricingNote ?? ''}>Налог/VAT рассчитывается при оплате в зависимости от данных покупателя.</p>
    </section>
  );
}
