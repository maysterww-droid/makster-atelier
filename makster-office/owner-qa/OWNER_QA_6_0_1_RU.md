# MAKSTER Office 6.0.1 — HTTPS Owner QA

Основа: оригинальный Makster AI 5.6 / Office 6.0, commit abfb543c0b6726351ae14451e195156905ffca74.
Ветка: feature/makster-office-6-0-1-https. Production не обновлялся.

## Доступ

Отдельный preview в существующем Vercel project makster-atelier. Вход — существующая учётная запись Vercel с доступом к команде Makster. Не нужен отдельный ключ Office, Node.js, ADB или пароль в чате. Защита платформы охватывает HTML, JS и все API. Прямые ссылки на ранее опубликованные фотографии остаются исходными ссылками сайта/Drive.

## Архитектура и безопасность

Сохранён исходный UI и SmmService. Подкаталог owner-qa упаковывает те же index.html/app.js/smm.js/styles.css; CSS ограничен классом owner-qa-https. В SMM preview скрыты CAD-панели и вкладки, чьи API намеренно не публикуются. Исходная локальная сборка остаётся неизменной.

Vercel Authentication → серверный gateway → отдельная Supabase Edge Function makster-office-qa601 → QA checkpoint в существующей public.makster_growth_sync_snapshots. Vercel env MAKSTER_QA_BRIDGE_TOKEN относится только к preview-ветке. В Edge Function хранится лишь SHA256 этого токена; ключ Supabase берётся из встроенного серверного окружения Supabase. Ключи не отправляются клиенту. Функция имеет собственную обязательную проверку токена: verify_jwt=false не означает публичный доступ к данным.

Разрешены чтение состояния, экспорт подготовленного пакета, сохранение фоточерновика и Creative Brief. Старые внутренние API не доступны; /import, /sync, /login, /qa-session и публикационные endpoints не включены. POST требует same-origin и специальный заголовок. Включены no-store, CSP, запрет iframe. Внешние платные сервисы и Metricool write API отсутствуют.

## Постоянное хранение

Проект Makster-Staging gkqntgfrbngspvrsqvmx, организация Makster Atelier 3ac6478a-a986-451f-9425-ba383aaa4ceb. Контрольная строка 60100000-0000-4000-a000-000000000001, scope MAKSTER_OFFICE_QA_601. Схема и RLS не изменялись; у anon нет SELECT grant. Новые таблицы не создавались.

QA хранится одним JSONB checkpoint, поскольку это ограниченная версия проверки с исходным aggregate-store. Черновик, двуязычный контент и audit сохраняются одним атомарным PATCH с ожидаемой revision. Конфликт вызывает перечитывание и максимум 2 повтора операции с тем же idempotency key. Нет зависимости от /tmp или памяти serverless-процесса. Это QA-адаптер, а не окончательная нормализованная модель ERP.

Исходные JSON и прежний QA ZIP не удалены. Инициализация INSERT ON CONFLICT DO NOTHING не перезаписывает изменённое QA-состояние. Перенесено 116 медиа, 2 contentDraftSets (фотокарусель и blocked brief), 5 audit events, 23 сырых platform records, 3 прежних snapshot. Календарь отображает 19 записей после точного URL+network dedupe. Оригиналы фотографий остаются в Drive; перенесены существующие метаданные.

## Проверки

- 45 автоматических тестов PASS: прежние 39 и 6 проверок новой границы и checkpoint.
- Live HTTPS GET /state: 200, 116 media / 19 calendar / исходные 2 draft records / 5 audit.
- Через HTTPS выбран проект «Светлая кухня с дубом», 3 изображения загружены.
- На CSS-ширине 454 px выбраны 2 фото и сохранена карусель «HTTPS QA 6.0.1 — кухня, проверка сохранения», ID ea76f7ca-4708-4e09-a11c-1dbf9397bab7.
- После F5 карусель и вкладка сохранились. SQL: revision=1, 116 уникальных media, draft records=3, audit=6; новая карусель ровно 1 раз, provider rows остались 23.
- Calendar, Analytics, Video Factory открыты через HTTPS. Широкая таблица Analytics прокручивается внутри своей области.
- На CSS-ширинах 454 и 340 px документ не имеет горизонтального переполнения. Ширина получена штатным browser zoom; это НЕ эмулятор Android и НЕ физический телефон. DevTools в среде запрещён. Android touch, клавиатура и первичный вход владельца требуют Owner QA на устройстве.
- Без авторизации preview/API ведут к входу Vercel; backend отдельно требует серверный токен.
- Исправлена обнаруженная при развёртывании несовместимость Buffer в Deno. После исправления live API работает; Vercel error/fatal logs за проверенный интервал 16:10–16:12 UTC отсутствуют.
- Полный legacy typecheck ранее содержит 99 ошибок. Этот выпуск не объявляет весь CAD/ERP прошедшим полный build.

## Ограничения и Owner QA

Metricool — реальный сохранённый снимок 21.11.2026, без фоновой синхронизации. Photo Factory использует подтверждённый каталог без LLM. Video Factory сохраняет brief и показывает BLOCKED_TECHNICAL; готового MP4 нет. Публикации из Office OFF; разрешение на регулярную автопубликацию существующего ChatGPT/Metricool не изменено.

Проверить на Android и компьютере: вход Vercel → Media Library → выбор 2–5 фото одного проекта → Photo Factory → сохранение/Copy → F5 и повторное открытие → Calendar → Analytics → Video Factory. Не отправлять тестовый пакет в Metricool.

Новых публикаций 0, платных AI-запросов 0, расходы AI $0. Платные планы, базы или подписки не подключались. Используются существующие Vercel/Supabase; отдельная стоимость инфраструктуры не измерялась. Три SMM-автоматизации не изменялись. Остановиться для Owner QA.
