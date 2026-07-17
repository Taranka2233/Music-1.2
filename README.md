# N54 Audio Deck

Локальный Android-аудиоплеер с интерфейсом в стиле Cyberpunk 2077. Музыка читается через Android MediaStore, а локальный YAMNet-анализ не отправляет аудио или PCM в сеть.

## Возможности

- библиотека треков, альбомов, артистов и избранного;
- очередь, shuffle, repeat, A–B, скорость и кроссфейд;
- десятиполосный EQ, пользовательские пресеты и локальный AI-профиль;
- интернет-радио только через HTTPS;
- Media Session, экран блокировки и кнопки гарнитуры;
- адаптивный Android-виджет с компактным и расширенным режимами;
- умная история, восстановление позиции длинных записей;
- JSON backup v2 с проверкой, предварительной сводкой и автоматическим откатом;
- Android Back закрывает текущий слой, а не выбрасывает пользователя из приложения.

Визуализаторы удалены: экран воспроизведения показывает обложку трека.

## Архитектура web-сборки

`www/` — единственный канонический исходник интерфейса. Сборка не изменяет его.

`npm run build:web`:

1. проверяет отсутствие legacy-визуализатора и старых runtime-модулей;
2. удаляет прежний `dist/`;
3. копирует `www/` в `dist/`;
4. добавляет настоящий `@capacitor/core/dist/capacitor.js`;
5. проверяет, что `dist/index.html` побайтно равен `www/index.html`;
6. создаёт `dist/build-manifest.json` с версией и SHA-256 исходника.

Capacitor, GitHub Pages, debug APK и signed release используют только `dist/`.

```text
www/                 канонический интерфейс
dist/                одноразовый build-артефакт, не хранится в git
native/              Java-плагины, ресурсы виджета и AI notice
scripts/build-web.mjs immutable web build
scripts/patch-android-v2.mjs генерация нативного Android-слоя
```

## Проверка

```bash
npm ci
npm run check
```

Команда выполняет:

- read-only аудит `www/` и JavaScript syntax check;
- проверку отсутствия AudioGuard, глобальных observers и визуализатора;
- поведенческие тесты backup rollback и cold-start команд виджета;
- immutable сборку `dist/`.

После команды `git diff -- www package.json package-lock.json capacitor.config.json` должен быть пустым. Workflows `Feature Audit` и `APK` имеют только `contents: read` и не изменяют ветку.

## Локальный web-запуск

```bash
npm ci
npm run serve
```

Сервер открывает `dist/` на порту 5173. Открывать `www/index.html` напрямую не рекомендуется: Capacitor runtime создаётся только во время build.

## Debug APK

```bash
npm ci
npm run model
npm run build:web
npx cap add android
npx @capacitor/assets generate --android
node scripts/patch-android-v2.mjs
npx cap sync android
cd android
./gradlew assembleDebug
```

Папка `android/` генерируется заново и не хранится в git. Готовая APK появляется в `android/app/build/outputs/apk/debug/app-debug.apk`.

Workflow `APK` дополнительно выполняет ZIP-проверку, 16-КБ zipalign, apksigner verification и сравнивает встроенный `assets/public/index.html` с `dist/index.html`.

## Signed release

Workflow `Signed Release APK` запускается вручную после добавления четырёх Repository secrets:

- `N54_KEYSTORE_BASE64`;
- `N54_KEYSTORE_PASSWORD`;
- `N54_KEY_ALIAS`;
- `N54_KEY_PASSWORD`.

Секреты доступны только шагу подписи. Keystore создаётся во временной папке и удаляется через `trap`.

## Нативные компоненты

- `MusicScannerPlugin` — разрешения и синхронизация MediaStore;
- `AudioAnalyzerPlugin` — локальный анализ через MediaPipe/YAMNet;
- `OutputGuardPlugin` — одно событие при отключении аудиовыхода;
- `HomeWidgetPlugin` и `N54WidgetProvider` — адресное управление виджетом;
- `N54CommandBridge2` — доставка команд конкретно в N54.

Удалённый `AudioGuard` не компилируется и не регистрируется. До перехода на Media3 приложение использует штатное управление аудиофокусом WebView.

## Ограничения

- APK из обычного workflow подписана debug-сертификатом и не является production release.
- `@jofr/capacitor-media-session` имеет GPL-3.0-or-later; перед публичным распространением нужно согласовать лицензию проекта или заменить зависимость.
- HTML Audio внутри WebView менее надёжен в фоне, чем нативный Media3/ExoPlayer foreground service. Переход на Media3 запланирован как отдельная архитектурная версия.
- Интернет-радио не проходит через локальный EQ из-за ограничений CORS/Web Audio у многих потоков.

## Версия

Текущая версия приложения: **1.1.0**.
