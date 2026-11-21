# MAKSTER AI OFFICE 6.1 — маркетинг и продвижение

Основа: Office 6.0 (abfb543) → защищённый Office 6.0.1 (c35d9cb). Продолжен тот же подкаталог owner-qa и те же SMM-модули. Ветка feature/makster-office-6-1-marketing. Новый Vercel/Supabase project не создавался.

## Граница продукта

В HTML и клиентском JS нет Kitchen Studio, Visual CAD, Engineering, Hardware/Appliance Studio, Dream Planner, складского, закупочного, производственного или CNC интерфейса. Старый app.js не поставляется. Не изменены исходники этих продуктов, основной сервер, VYTA, сайт или root vercel.json. UI использует карточки, стили и SMM-экраны существующего Office с единой маркетинговой навигацией (15 экранов). Отдельные Pro API не опубликованы.

## Восстановление: что найдено и повторно использовано

- packages/owner-operations/src/makster-ai-office.ts: 12 ролей, createOfficeCampaign, createOfficeApproval, runMaksterOfficeCycle. Это исторический rule/template engine, без LLM. Пять необходимых деклараций извлечены из исходного compiled marketing module, без функций project revenue bridge, автосписаний или мебельной ERP. recover-history.mjs --check подтверждает точное соответствие исходнику. SHA256 исходного compiled файла записан в marketing-history.mjs.
- content-social-autopilot.ts найден и проверен прежними тестами: требует ProjectModel/материалов/стадий Pro, создаёт обязательные approvals публикаций. Прямое подключение в 6.1 не выполнялось: оно нарушило бы границу продукта и текущий SMM-процесс. Вместо него сохранена работающая Photo Factory 6.0.1 с каталогом реальных работ.
- SmmService, Media Library, Photo Factory, Video Factory, calendar dedupe, snapshot analytics и scoped checkpoint — повторно использованы из 6.0.1.
- Отдельных рабочих исторических Research Desk / Idea Lab в доступном дереве Makster 5.6 не найдено. В 6.1 реализовано настоящее сохранение заметок/источников, аудиторий и идей; автоматического исследования или AI-генерации не заявлено.
- Модули 5.1/5.3/5.4/5.5/5.6 проверены прежними 32 профильными тестами. VYTA-код не переносился.

## Функции и честные статусы

| Функция | Статус | Что выполняется |
|---|---|---|
| Marketing Dashboard | REAL | Считает материалы, записи календаря, кампании и pending approvals из серверного состояния |
| Growth Director / 12 ролей | MOCK / TEMPLATE | Исторические рекомендации с целью и сохранёнными заметками в контексте; не LLM-анализ |
| Research Desk | PARTIAL | Запись HTTPS-источника и наблюдения владельца; источник OWNER_PROVIDED_UNVERIFIED |
| Audience & Idea Lab | PARTIAL | Сохранение гипотез и идей, привязка к существующему проекту Media Library |
| Campaign Planner | REAL / INTERNAL PLAN | Кампании, цели, каналы, плановый бюджет; фактический рекламный spend NOT AVAILABLE |
| Media / Photo Factory | REAL | 116 записей каталога, реальные изображения, двуязычные сохранённые черновики |
| Content Factory | REAL | Единый список фоточерновиков и Creative Brief, переход к производственным SMM-экранам |
| Creative Studio / Video | PARTIAL | Сохраняется отдельный brief; BLOCKED_TECHNICAL для вертикального сервиса/естественной чешской озвучки |
| Social Media / Calendar | REAL SNAPSHOT | История и планы Metricool, ссылки и исходные IDs; прямой publisher OFF |
| Advertising / Approval | REAL / INTERNAL PLAN | Запрос и решение бюджета, повторные решения запрещены; рекламы/расходов не выполняет |
| Performance Analytics | REAL SNAPSHOT | Реальные сохранённые показатели отдельно IG/FB, null → NOT AVAILABLE |
| Owner Brief | REAL STATE / RULES | Текущие числа/приоритеты и сохранённая история Brief |
| Audit Log | REAL | Серверная неизменяемая через UI история, без кнопки удаления |
| Live AI, автопоиск, Ads API | NOT CONNECTED | Платные вызовы отсутствуют |

## Хранение и доступ

Сохранён механизм 6.0.1: Vercel Authentication → gateway → отдельная Edge Function makster-office-qa61 → существующий QA checkpoint в Makster-Staging gkqntgfrbngspvrsqvmx. Функция 6.0.1 makster-office-qa601 и её preview не заменены.

Новый 256-bit bridge token относится только к preview-ветке 6.1, хранится в Vercel server env. Edge Function содержит только SHA256 токена и использует встроенный серверный Supabase key. Ключи не передаются браузеру. UI/API без авторизации требуют входа Vercel; backend отдельно проверяет bridge token. POST: same-origin, client header, idempotency key. Сохраняются CSP/no-store и запрет внешних исполнителей.

Основная QA-строка: 60100000-0000-4000-a000-000000000001, организация 3ac6478a-a986-451f-9425-ba383aaa4ceb, scope MAKSTER_OFFICE_QA_601. Атомарный commit с revision сохраняет все действия и audit вместе; конфликт перечитывается и ограниченно повторяется с тем же ключом. Таблицы и RLS не менялись. Снимок перед 6.1 отдельно сохранён в строке 61000000-0000-4000-a000-000000000001, scope MAKSTER_OFFICE_PRE_61_BACKUP. Исходные 116 media, 3 draft sets и 6 audit events сохранены; миграция не обнуляет состояние.

## Проверки

51 профильный автоматический тест PASS, включая 6 новых: точность recovery, отсутствие Pro bundle, валидация источников/проектов, planning/approval idempotency, 12 template runs + Brief, сохранность SMM и запрет исключённых операций. Полный старый typecheck всего Pro/ERP не объявляется зелёным (известные 99 legacy ошибок не относятся к этому preview).

В HTTPS UI сохранены QA-источник, идея с реальным проектом, внутренняя кампания с нулевым бюджетом, запрос согласования и отклонение; запущен один MOCK/TEMPLATE цикл (12 runs), создан Brief. После F5 восстановлена вкладка Owner Brief и сохранённые данные. SQL подтвердил 116 media, 1 кампанию, 1 цикл, 12 runs; provider rows остались 23 (19 отображаются после dedupe).

Все 15 экранов открыты мобильным меню на 340 и 454 CSS px, горизонтального переполнения нет. Проверка сделана штатным browser zoom, а не Android emulator. Физический Android, touch и клавиатура требуют Owner QA. При быстрой навигации выявлена и исправлена двойная загрузка SMM, сбрасывавшая введённый текст Photo Factory: форма теперь появляется после единственной загрузки раздела.

Через Photo Factory на мобильной ширине создана новая двухъязычная QA-карусель b27d5e2f-2f2e-4467-aac9-5cb22b3fedb8 («OWNER QA 6.1 — мобильная карусель»). После F5 карусель осталась. Исправление двойной загрузки подтверждено повторным быстрым заполнением формы: введённый заголовок и checkbox не сбрасываются.

## Owner QA

Открыть защищённый preview 6.1 через учётную запись Vercel команды Makster. Проверить Dashboard → Research Desk → Idea Lab → Campaign Planner → Advertising/решение → Growth Cycle (MOCK) → Owner Brief → Audit Log → Media Library/Photo Factory → Calendar → Analytics → Video Factory. Обновить страницу и повторно открыть ссылку с телефона и компьютера.

Metricool остаётся реальным снимком 21.11.2026, фоновой синхронизации нет. Три ChatGPT SMM-автоматизации не изменялись; повседневное согласование их публикаций не вводилось. Новых публикаций, рекламных операций и платных AI-вызовов 0; AI-расходы $0. Использована существующая инфраструктура, новые платные планы не подключались. Production-сайт и main не обновлялись. Остановиться для OWNER QA.

Финальный SQL-контроль после UI QA: revision=8; 116 media и 116 уникальных ID; draft sets=4, все 3 исходных сохранены; новая мобильная карусель ровно в одном экземпляре; сырые provider rows=23; external executions=0; agent runs=12. В Vercel error/fatal logs за финальный UI-интервал 17:04–17:07 UTC ошибок не найдено.
