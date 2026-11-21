# MAKSTER Office 6.0 — SMM & Creative Integration, Owner QA

Дата проверки: 21 ноября 2026, Europe/Prague.
Это частичная интеграция на реальных данных для Owner QA. Полным production-релизом она не объявляется.

## Основа и контрольное состояние

Найден оригинальный полный архив `Makster_AI_5.6_DEPLOYMENT_0.1_MAKSTER_STAGING.zip`, более свежий, чем перечисленные в задании 5.2 / 5.3. Он содержит Makster Core 5.6, AI Office (12 ролей), Growth Autopilot, Content Studio, CRM, оригинальный web UI и сервер, file/Supabase stores, миграции и тесты.

Архив восстановлен из сохранённых файлов, не заменён кодом VYTA. SHA256 оригинала: `2a4ae1eef97d924a13753f296ee23ac0ddf42e015c0794cdf2cd8e5adfbcca45`.
Контрольный локальный commit импорта исходников: `449bb79`. Изменения находятся в `makster-office/` отдельной ветки `feature/makster-office-6-smm` репозитория `maysterww-droid/makster-atelier`. Файлы production-сайта за пределами этой папки не изменялись. Оригинальный архив сохранён отдельно.

GitHub main на старте: `5c5ad170d962e6a67dd1c52ae7c895df1582eb02` — сайт MAKSTER. `creative-studio-0.1`: `ed7f09d667e60dbdc6fcd40f9c70b21a0c765d14` — отдельная Creative Studio 1.4. Office в актуальных ветках GitHub найден не был; восстановлена именно сохранённая сборка 5.6. Более свежая реально доступная сборка Office в выполненном поиске не найдена; версия, установленная на компьютере владельца, удалённо не проверена.

## Что использовано повторно

- Оригинальные HTML, app.js, стили, вкладки AI Office и Content Studio.
- Оригинальный Node HTTP server и OwnerOperationsStore.
- SupabaseOwnerOperationsStore с существующими таблицами JSON, organization_id и RLS.
- Существующий Growth Audit Log и структуры creativeAssets, contentDraftSets, officeContent, publishJobs и growthSyncSnapshots.
- Контракт отдельной Creative Studio: CampaignCreativeRequest / brand isolation. Внешний `brand_id` Studio — `MAKSTER_ATELIER`, внутренний namespace Office — `makster-atelier`; преобразование явно задано.
- Существующие Drive, Sheets и Metricool — без переноса бинарной библиотеки в новую БД.

## Реальные данные

Каталог: https://docs.google.com/spreadsheets/d/1V_g57azZ2FI2S39eUVlTLkC1m_TvFl_DN141_yqKvhI/edit

Библиотека: https://drive.google.com/drive/folders/1QcOzFwX_gyf8A8-kJccS2XHIlWSGcfiA

Получены 116 строк изображений: REAL 89, PROCESS 12, MATERIAL 6, BRAND 9. Уникальных Project ID — 23: 22 проектные группы плюс BRAND-MAKSTER. Сохранены Photo ID, Project ID, Drive ID, original URL, social URL, описания RU/CS, разрешение и исходный статус. Оригиналы остаются в Google Drive. Миниатюры используют существующие опубликованные версии. В браузере фактически загружены три фотографии «Светлая кухня с дубом».

У Sheet свой timezone America/Los_Angeles. Он не используется как часовой пояс публикаций: даты Metricool сохраняются с Europe/Prague.

Metricool Brand 8158823 подтверждён: Instagram maksteratelier, Facebook MAKSTER ATELIER, Europe/Prague. Прочитаны календарь и аналитика за доступный период 16–21 ноября; календарный запрос охватывал 16 ноября — 15 декабря.

Ответ календаря фактически содержит и прошлые публикации, несмотря на описание операции «scheduled». Импорт нормализует реальные статусы PENDING / PUBLISHED / ERROR. На снимке 11 planner ID, 19 платформенных записей после объединения с аналитикой: 10 будущих (5 общих слотов для двух соцсетей), 8 опубликованных, 1 ошибка Instagram. Опубликованные planner/analytics записи объединяются только по точному public URL и сети; похожие тексты и изображения не используются для выдуманного сопоставления.

Ошибка Instagram ранее существовала в Metricool: неподходящий aspect ratio изображения. Office показывает её как ERROR, не перепубликовывает и не меняет исходную запись.

Аналитика показывает полученные значения отдельно для Instagram/Facebook, включая просмотры, охваты, сохранения, взаимодействия и подписчиков. null остаётся NOT AVAILABLE. Дневной уникальный охват не суммируется в вымышленный охват периода. Время аналитической записи без указанного source timezone остаётся без придуманного преобразования. Подтверждённого источника лидов нет. Сводные переходы на сайт недоступны; отдельные доступные клики Facebook-поста сохранены с исходной метрикой.

## REAL / PARTIAL / MOCK / NOT CONNECTED

| Компонент | Статус | Фактическое поведение |
|---|---|---|
| Восстановленный Office 5.6 | REAL source / PARTIAL system | Оригинальная программа и модули; установленная владельцем версия не проверена |
| Media Library | REAL snapshot | 116 реальных записей; миниатюры, фильтры, оригиналы, социальные версии, выбор 1–5, история подготовок |
| Drive/Sheets continuous sync | PARTIAL | Данные получены через подключённые аккаунты и импортированы; постоянный OAuth/API-канал из standalone Office не настроен |
| Photo Factory | REAL preparation | RU первым, CS вторым; текст из подтверждённого каталога, разные CTA для IG/FB; сохранение на сервере, экспорт пакета |
| Growth Director для новых фотопостов | PARTIAL / RULES | Тема владельца и проверенные данные проекта; живое генеративное исследование не подключалось |
| Media QA | PARTIAL | ID, количество, один REAL-проект, разрешение, повторы; полноценная визуальная оценка остаётся человеку |
| История внешнего использования фото | PARTIAL | Статусы каталога и история Office; автоматическое сопоставление CDN-фото поста с Drive ID не заявляется |
| Metricool calendar | REAL snapshot | Реальные ID, даты, статусы, текст, медиа и ссылки; безопасный повторный импорт |
| Metricool analytics | REAL, частичное покрытие | Только доступные поля и реальные null; не все показатели предоставлены |
| Постоянное обновление Metricool | PARTIAL | Контракт read-only bridge готов; URL/token сервера не настроены. Кнопка обновления Office перечитывает сохранённый снимок |
| Передача в действующий SMM-процесс | PARTIAL | JSON-пакет подготовлен для существующего публикатора; автоматический забор этих пакетов действующими заданиями не подключён |
| Публикации из Office | NOT CONNECTED / OFF | Нет publish endpoint, планирования в Metricool, второго scheduler или передачи управления |
| Creative Studio integration | PARTIAL | Совместимый Creative Brief, экспорт и сохранённый BLOCKED_TECHNICAL; живой production-service не вызван |
| Финальный вертикальный MP4 + natural CS voice | NOT CONNECTED | Не выдаётся за готовое видео |
| Persistence в Owner QA | REAL original file store | Перезапуск сохраняет данные, использованы исходные структуры Office |
| Supabase runtime | PARTIAL | Проект/схемы/RLS проверены, адаптер протестирован; server secret в preview не подключался, живая запись из этой сборки не проверена |
| Старые «агентные» циклы | RULES / отдельные MOCK/fallback сценарии | Они не стали живым AI от добавления вкладок; внешние рекламные executors и OpenAI не включались |

## Supabase

Makster-Staging `gkqntgfrbngspvrsqvmx` ACTIVE_HEALTHY, PostgreSQL 17.6.1.166. Нужные makster_office_content, makster_creative_assets, makster_content_draft_sets, makster_publish_jobs, makster_content_performance, makster_growth_connections, makster_growth_sync_snapshots и makster_growth_audit_log уже существуют; до интеграции маркетинговые таблицы были пусты.

Проверены миграции, фактические столбцы id / organization_id / data_json / updated_at и политики. RLS включена; SELECT для authenticated ограничен owner/admin организации. Таблицы, политики и миграции не менялись; записей в удалённую БД эта работа не добавляла. Отдельная БД для библиотеки не создавалась.

Для будущего server-side подключения разрешён только данный проект и проверенная организация Makster Atelier `3ac6478a-a986-451f-9425-ba383aaa4ceb`, не staging acceptance organization и не Mayster. Неверная конфигурация SMM блокируется. Ключи остаются server-side. Обновления ограничиваются перечисленными таблицами и SMM namespace; чужие legacy-записи не перезаписываются.

## Проверки A–D

| Тест | Результат |
|---|---|
| A — Media Library | PASS в браузере: найдена реальная светлая кухня с дубом, 3 миниатюры загружены, описания и ссылки Drive/social доступны |
| B — Фото | PASS: из 3 реальных фотографий создан и сохранён RU/CS draft `b3656f4c-f57d-4484-a213-73e659bc7836`, отдельные тексты IG/FB, CTA, галочка Copy. Внешняя публикация не выполнялась |
| C — Metricool | PASS на реальном снимке: будущая запись `435354131`, 23.11.2026 10:00 Europe/Prague, показана без создания записи в Metricool; повторный импорт идемпотентен; planner/analytics объединены по source URL |
| D — Creative Studio | PASS ветки технического ограничения: Creative Brief `d8fbff6a-70ce-4c72-a541-ce533be896c9` сохранён, статус BLOCKED_TECHNICAL. Реальная передача живому Studio-service не подтверждена. MP4 не создан |

Автоматические проверки: 32 существующих маркетинговых теста PASS до/после; 7 новых сценариев PASS (импорт, дубли, null-метрики, RU/CS draft, restart, QA-блокировки, Studio contract, Supabase adapter с fake transport, HTTP auth/CSRF и отсутствие publish endpoint). Новый SMM boundary проходит strict TypeScript.

Общий legacy `npm run build` / typecheck исходника 5.6 падает на ранее существовавших ошибках exactOptionalPropertyTypes, измерений и старых тестов. Эти ошибки не скрыты ослаблением tsconfig. `npm run build:smm` отдельно проверяет новый модуль и пересобирает только четыре затронутых Office server modules, сохраняя несвязанные prebuilt CAD/production artifacts. Полная программа не объявляется прошедшей общий typecheck.

Browser QA выполнена в Chromium/Linux. Windows и физический Android не проверялись. Native APK не создавалась. Скриншоты находятся в QA пакета.

## Что осталось для полной интеграции

1. Разместить восстановленный Office в согласованном тестовом hosting/runtime, сохранив его идентичность. Текущий preview относится только к рабочей сессии и не является постоянным внешним адресом.
2. Подключить серверный read-only bridge/OAuth к существующим Google и Metricool аккаунтам. Наличие подключений у ChatGPT не даёт standalone Node-server их секреты автоматически. Секреты в чат не отправлять.
3. Проверить реальный Supabase runtime через штатное секретное окружение; отдельного запроса на новую схему нет.
4. Подключить потребление Office preparation packages действующим SMM-процессом, не создавая второго scheduler. До этого передача — экспорт, не автоматическая публикация.
5. Подключить отдельный production endpoint Creative Studio для вертикального MP4, natural Czech voice, captions, Media QA и Final Asset callback. Финальный asset должен иметь brand/request ID, sha256, QA PASS и статус проверки; концепты сохраняют свой тип.
6. Перед переносом публикаций непосредственно в Office — отдельное решение владельца. Его нынешнее разрешение на регулярную автопубликацию не отменялось, ежедневные новые Approval не добавлены.

## Запуск Owner QA

Архив распаковать в отдельную рабочую папку, не поверх рабочих проектов. Нужен Node 22+; prebuilt runtime включён. На Windows открыть `START_OFFICE_6_OWNER_QA.cmd`; адрес http://127.0.0.1:8796/. Войти кнопкой «Открыть изолированный Owner QA». Данный режим не предназначен для публикации в Интернет.

Launcher использует `.smm/owner-operations.json`, импорт `.smm/import.json`, удаляет из своего процесса production/paid credentials и блокирует старые POST-действия. Существующие файлы бизнес-данных Office не перезаписываются. Снимок содержит актуальные для момента проверки реальные маркетинговые данные, а не демонстрационные числа. `.smm` и ключи не находятся в публичной GitHub-ветке; они входят только в приватный QA-пакет без owner-key.txt.

Для нормального сервера предусмотрен `.env.smm.example`; переменные задаются штатным секретным окружением. Сессии Owner QA и полномочия normal deployment не смешиваются. Старые legacy API требуют отдельного полного auth-аудита перед публичным размещением: добавление SMM не делает весь старый Core безопасным для публичного Интернета.

Порядок проверки: Media Library → проект «Светлая кухня с дубом» → 1–3 фото → Photo Factory → сохранить → Copy → календарь → сравнить ID 435354131 с Metricool → Video Factory → сохранить brief → увидеть технический статус → F5 и проверить сохранность.

Существующие три MAKSTER-автоматизации не изменялись, не отключались и не дублировались. Их publisher по-прежнему Metricool. Во время разработки не использовались create/update scheduled post, paid generation или ad execution. Новых публикаций: 0. Фактические расходы AI: **$0**. Новых подписок: 0. Production-домены: без изменений.

После подготовки этой сборки — остановка для OWNER QA. Production не обновляется.
