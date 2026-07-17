# N54 Audio Deck

Локальный Android-аудиоплеер с интерфейсом в стиле Cyberpunk 2077. Треки читаются через MediaStore, а YAMNet-анализ выполняется локально и не отправляет аудио в сеть.

## Возможности

- библиотека, альбомы, артисты, избранное и плейлисты;
- очередь, shuffle, repeat, A–B, скорость и кроссфейд;
- десятиполосный EQ, пользовательские и локальные AI-профили;
- HTTPS-радио, Media Session и управление с гарнитуры;
- адаптивный Android-виджет;
- история, позиции длинных записей и backup JSON v2 с откатом;
- Android Back закрывает текущий слой;
- экран воспроизведения показывает обложку — визуализаторы удалены.

## Канонический web build

`www/` — единственный исходник интерфейса. Сборка его не изменяет.

```bash
npm ci
npm run check
```

`npm run check` выполняет read-only аудит, поведенческие тесты и создаёт `dist/`. В `dist/` копируется `www/`, добавляется Capacitor runtime и создаётся `build-manifest.json`. `dist/index.html` обязан побайтно совпадать с `www/index.html`.

Capacitor, GitHub Pages, debug APK, signed APK и signed AAB используют один `dist/`. Workflows имеют только `contents: read` и не коммитят изменения.

## Локальный запуск

```bash
npm run serve
```

Сервер открывает `dist/` на порту 5173.

## Debug APK

```bash
npm ci
npm run model
npm run build:web
npx cap add android
npx @capacitor/assets generate --android
node scripts/patch-android-v2.mjs
npx cap sync android
cd android && ./gradlew assembleDebug
```

Workflow `APK` дополнительно проверяет ZIP, 16-КБ zipalign, подпись v2/v3 и совпадение встроенного `assets/public/index.html` с `dist/index.html`.

## Signed APK и AAB

Workflow `Signed Release APK and AAB` запускается вручную после добавления Repository secrets:

- `N54_KEYSTORE_BASE64`;
- `N54_KEYSTORE_PASSWORD`;
- `N54_KEY_ALIAS`;
- `N54_KEY_PASSWORD`.

Он выпускает подписанную APK для прямой установки и подписанный AAB для Google Play. Оба пакета собираются из одного `dist/`. Keystore доступен только шагу подписи и удаляется после завершения.

Workflow `AAB Audit` без секретов собирает unsigned `bundleRelease` и проверяет `base/assets/public/index.html` по тому же SHA-256.

## Media3 — этап 3

В APK уже компилируются Media3 1.10.1, `ExoPlayer`, `N54PlaybackService` и `N54Media3Plugin`. Сервис объявлен как `MediaSessionService` с foreground service type `mediaPlayback`.

Миграция пока работает в теневом режиме:

- HTML Audio остаётся единственным активным звуковым движком;
- кнопка в разделе «Система» вызывает только `validateQueue()`;
- проверка не загружает очередь в ExoPlayer и не переключает звук;
- реальный `setQueue()` доступен только после feature flag `n54_media3_enabled`;
- CI проверяет, что shadow validation не вызывает активацию.

Следующий шаг — тест URI очереди на физическом Android, затем подготовка очереди в ExoPlayer без воспроизведения и только после этого controlled cutover.

## Нативный слой

- `MusicScannerPlugin` — MediaStore и разрешения;
- `AudioAnalyzerPlugin` — MediaPipe/YAMNet;
- `OutputGuardPlugin` — пауза при отключении аудиовыхода;
- `HomeWidgetPlugin`, `N54WidgetProvider`, `N54CommandBridge2` — адресный виджет;
- `N54PlaybackService`, `N54Media3Plugin` — staged Media3 playback owner и контроллер.

Конфликтующий ручной AudioGuard удалён. До полного cutover текущим воспроизведением управляет штатный WebView.

## Ограничения

- обычная CI APK подписана debug-сертификатом;
- `@jofr/capacitor-media-session` имеет GPL-3.0-or-later и требует лицензионного решения перед публичным релизом;
- HTML Audio в фоне менее надёжен, чем Media3/ExoPlayer foreground service;
- радио не проходит через локальный EQ из-за CORS/Web Audio ограничений потоков.

Текущая версия: **1.1.0**.
