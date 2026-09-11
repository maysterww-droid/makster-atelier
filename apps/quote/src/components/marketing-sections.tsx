import Link from 'next/link';
import styles from '@/app/marketing.module.css';

const workflow = [
  ['01', 'Задайте проект', 'Кухня, шкаф, гардеробная или другой корпусный проект. Размеры, материалы и конструкция — без бухгалтерского тумана.'],
  ['02', 'Соберите конструкцию', 'Корпуса, фасады, фурнитура, работа и технологические операции становятся одной понятной моделью проекта.'],
  ['03', 'Получите True Cost', 'Makster считает реальную себестоимость, маржу и цену продажи на основе вашего Price Book — без вымышленных закупочных цен.'],
  ['04', 'Отправьте предложение', 'Подготовьте аккуратный PDF для клиента и сохраните техническую основу для дальнейшей передачи в Makster Pro.'],
];

const features = [
  ['True Cost Engine', 'Материалы, фурнитура, работа, накладные расходы и маржа в одном расчёте.'],
  ['Your Price Book', 'Ваши закупочные цены и правила. Makster не подменяет реальность «средней ценой из интернета».'],
  ['Cabinet logic', 'Расчёт опирается на конструкцию мебели, а не на свободную таблицу из строк и формул.'],
  ['Client-ready PDF', 'Коммерческое предложение выглядит как документ мастерской, а не как распечатка из Excel.'],
  ['Project history', 'Версии, статусы и история проекта остаются в одном рабочем пространстве.'],
  ['Makster ecosystem', 'Quote готовится как входная точка в Visualizer, Makster Pro и будущую производственную цепочку.'],
];

const faqs = [
  ['Makster Quote — это замена Excel?', 'Да, но не просто более красивый Excel. Quote строит расчёт вокруг реальной мебельной конструкции, Price Book и себестоимости, чтобы коммерческая часть не жила отдельно от проекта.'],
  ['Нужно ли сразу заполнять весь прайс-лист?', 'Нет. Можно начать с основных материалов и фурнитуры. Если цены нет, Makster должен показать это явно, а не подставлять вымышленную стоимость.'],
  ['Можно ли использовать Quote без Makster Pro?', 'Да. Quote проектируется как самостоятельный облачный продукт. При этом структура данных сразу готовится к связке с Makster Pro.'],
  ['Будет ли мобильная версия?', 'Да. Публичный сайт и ключевые сценарии Quote проектируются адаптивно. Полноценное инженерное редактирование удобнее на большом экране, но просмотр проектов и быстрые действия должны работать и на телефоне.'],
  ['Какие языки планируются?', 'Архитектура готовится к Launch Pack: English как fallback, русский, чешский, немецкий и польский.'],
];

function Brand() {
  return <span className={styles.brand}><span className={styles.brandMark}>M</span><span><strong>Makster</strong><small>Quote</small></span></span>;
}

export function MarketingHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brandLink}><Brand /></Link>
      <nav className={styles.nav} aria-label="Основная навигация">
        <a href="#workflow">Как работает</a><a href="#product">Продукт</a><a href="#features">Возможности</a><a href="#pricing">Тарифы</a><a href="#faq">FAQ</a>
      </nav>
      <div className={styles.headerActions}><Link href="/login" className={styles.ghostButton}>Войти</Link><Link href="/login" className={styles.primaryButton}>Попробовать</Link></div>
      <details className={styles.mobileMenu}><summary aria-label="Открыть меню">Меню</summary><div><a href="#workflow">Как работает</a><a href="#product">Продукт</a><a href="#pricing">Тарифы</a><Link href="/login">Войти в Quote</Link></div></details>
    </header>
  );
}

function MiniQuotePreview() {
  return (
    <div className={styles.heroProduct} aria-label="Пример интерфейса Makster Quote">
      <div className={styles.windowBar}><span /><span /><span /><em>Kitchen · Novák</em></div>
      <div className={styles.appPreview}>
        <aside><Brand /><div className={styles.fakeNav}><b>Обзор</b><span>Конструкция</span><span>Price Book</span><span>Документы</span></div></aside>
        <div className={styles.previewMain}>
          <div className={styles.previewTop}><div><small>PROJECT MQ-0047</small><strong>Kitchen Novák</strong></div><button>PDF</button></div>
          <div className={styles.previewStats}><div><span>Себестоимость</span><b>128 460 Kč</b></div><div><span>Маржа</span><b>34.8%</b></div><div className={styles.darkStat}><span>Цена клиенту</span><b>196 900 Kč</b></div></div>
          <div className={styles.previewGrid}>
            <div className={styles.cabinetList}><small>КОРПУСА · 8</small><div className={styles.activeRow}><i /><span><b>Base 600</b><small>2 фасада · 3 полки</small></span><em>8 420</em></div><div><i /><span><b>Sink 800</b><small>мойка · 2 фасада</small></span><em>9 180</em></div><div><i /><span><b>Tall 600</b><small>духовой шкаф</small></span><em>14 760</em></div></div>
            <div className={styles.costCard}><small>TRUE COST</small><div><span>Материалы</span><b>66 340</b></div><div><span>Фурнитура</span><b>31 520</b></div><div><span>Работа</span><b>21 600</b></div><div><span>Накладные</span><b>9 000</b></div><hr/><strong>128 460 Kč</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>MAKSTER QUOTE · FURNITURE PRICING OS</span>
        <h1>Считайте мебель так, как вы её <em>реально производите.</em></h1>
        <p>Makster Quote связывает конструкцию, ваш Price Book, реальную себестоимость и коммерческое предложение — чтобы цена для клиента рождалась из проекта, а не из догадок.</p>
        <div className={styles.heroActions}><Link href="/login" className={styles.primaryButton}>Начать пилот <span>→</span></Link><a href="#workflow" className={styles.secondaryButton}>Посмотреть workflow</a></div>
        <div className={styles.trustRow}><span>Price Book</span><span>True Cost</span><span>Client PDF</span><span>Makster Pro-ready</span></div>
      </div>
      <MiniQuotePreview />
    </section>
  );
}

export function WorkflowSection() {
  return <section id="workflow" className={styles.section}><div className={styles.sectionHead}><span className={styles.eyebrow}>WORKFLOW</span><h2>От размеров до предложения клиенту — одна цепочка.</h2><p>Без копирования одних и тех же данных между калькулятором, таблицей и PDF.</p></div><div className={styles.workflow}>{workflow.map(([n,t,d]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>;
}

function QuoteBuilderShot() {
  return <div className={styles.shotUi}><div className={styles.shotHeader}><span>Kitchen Novák</span><b>Live cost</b></div><div className={styles.shotColumns}><div className={styles.shotList}><small>MODULES</small>{['Base 600','Drawer 800','Sink 800','Tall Oven'].map((x,i)=><div className={i===1?styles.selected:''} key={x}><span>{x}</span><em>{[8420,11380,9180,14760][i]} Kč</em></div>)}</div><div className={styles.editorCard}><small>DRAWER 800</small><b>800 × 560 × 720</b><div className={styles.fieldMock}><span>Корпус 18 mm</span><span>3 × LEGRABOX</span><span>Фасад painted MDF</span><span>Blum TIP-ON</span></div></div></div></div>;
}
function PriceBookShot() {
  return <div className={styles.shotUi}><div className={styles.shotHeader}><span>Price Book</span><b>214 позиций</b></div><div className={styles.priceRows}>{[['EGGER W1100 ST9 18 mm','1 780 Kč / лист'],['Blum LEGRABOX M','1 190 Kč / комплект'],['Кромка ABS 1 mm','18 Kč / м'],['Монтаж мастерской','620 Kč / ч']].map(([a,b],i)=><div key={a}><i className={i===1?styles.greenDot:''}/><span><b>{a}</b><small>{i<3?'Закупочная цена':'Работа'}</small></span><strong>{b}</strong></div>)}</div></div>;
}
function ProposalShot() {
  return <div className={styles.documentMock}><div className={styles.docBrand}><Brand /><span>MQ-0047</span></div><h4>KITCHEN NOVÁK</h4><p>Индивидуальная кухня · Praha</p><div className={styles.docImage}><span>MAKSTER</span></div><div className={styles.docTotal}><span>Итого для клиента</span><strong>196 900 Kč</strong></div><small>Предложение действительно 14 дней · детали проекта и условия монтажа включены в документ.</small></div>;
}

export function ProductSection() {
  const cards = [
    ['01 / QUOTE BUILDER','Расчёт, который понимает мебель','Каждый модуль — часть конструкции, а не просто строка в таблице.',<QuoteBuilderShot key="q"/>],
    ['02 / PRICE BOOK','Ваши цены — ваша реальность','Закупка, работа и операции управляются из собственного Price Book.',<PriceBookShot key="p"/>],
    ['03 / CLIENT OUTPUT','Предложение, которое можно отправить','Цена превращается в аккуратный коммерческий документ без ручной сборки.',<ProposalShot key="d"/>],
  ] as const;
  return <section id="product" className={`${styles.section} ${styles.productSection}`}><div className={styles.sectionHead}><span className={styles.eyebrow}>PRODUCT</span><h2>Не «калькулятор». Рабочий стол мебельщика.</h2></div><div className={styles.productCards}>{cards.map(([k,t,d,ui])=><article key={k}><div><span className={styles.eyebrow}>{k}</span><h3>{t}</h3><p>{d}</p></div>{ui}</article>)}</div></section>;
}

export function FeaturesSection() {
  return <section id="features" className={styles.section}><div className={styles.sectionHead}><span className={styles.eyebrow}>CAPABILITIES</span><h2>Сделано вокруг настоящего мебельного процесса.</h2></div><div className={styles.featureGrid}>{features.map(([t,d],i)=><article key={t}><span>0{i+1}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>;
}

export function PricingSection() {
  return <section id="pricing" className={`${styles.section} ${styles.pricingSection}`}><div className={styles.sectionHead}><span className={styles.eyebrow}>PRICING</span><h2>Начните с пилота. Тарифы растут вместе с мастерской.</h2><p>Финальные коммерческие цены закрепим перед публичным запуском — сейчас архитектура тарифов уже видна на сайте, но не притворяется утверждённым прайсом.</p></div><div className={styles.pricingGrid}>
    <article><span className={styles.eyebrow}>PILOT</span><h3>Starter</h3><strong>0 Kč</strong><small>на этапе закрытого пилота</small><ul><li>Основной Quote Builder</li><li>Price Book</li><li>PDF предложения</li><li>1 мастерская</li></ul><Link href="/login" className={styles.secondaryButton}>Начать пилот</Link></article>
    <article className={styles.featuredPlan}><span className={styles.planBadge}>RECOMMENDED</span><span className={styles.eyebrow}>PRO</span><h3>Workshop</h3><strong>На запуске</strong><small>цена будет утверждена отдельно</small><ul><li>Всё из Starter</li><li>Расширенные шаблоны</li><li>История версий</li><li>Интеграция с Makster Pro</li></ul><Link href="/login" className={styles.primaryButton}>Войти в пилот</Link></article>
    <article><span className={styles.eyebrow}>TEAM</span><h3>Atelier</h3><strong>Custom</strong><small>для команды и производства</small><ul><li>Несколько пользователей</li><li>Роли и доступы</li><li>Командный Price Book</li><li>Расширенные интеграции</li></ul><a href="#final-cta" className={styles.secondaryButton}>Обсудить</a></article>
  </div></section>;
}

export function FAQSection() {
  return <section id="faq" className={styles.section}><div className={styles.faqLayout}><div className={styles.sectionHead}><span className={styles.eyebrow}>FAQ</span><h2>Вопросы до первого расчёта.</h2><p>Если ответа здесь нет — это хороший кандидат в следующую версию продукта.</p></div><div className={styles.faqList}>{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section>;
}

export function FinalCTA() {
  return <section id="final-cta" className={styles.finalCta}><div><span className={styles.eyebrow}>MAKSTER QUOTE</span><h2>Следующая смета должна занимать меньше времени — и оставлять больше маржи.</h2><p>Запустите пилот на реальном проекте и настройте Quote под собственную мастерскую.</p></div><Link href="/login" className={styles.lightButton}>Открыть Makster Quote <span>→</span></Link></section>;
}

export function MarketingFooter() {
  return <footer className={styles.footer}><Brand /><p>Makster Quote · часть экосистемы Makster Atelier</p><div><a href="#product">Продукт</a><a href="#pricing">Тарифы</a><Link href="/login">Войти</Link></div></footer>;
}
