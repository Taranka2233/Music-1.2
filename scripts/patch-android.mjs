#!/usr/bin/env node
/**
 * Накатывает натив поверх свежесгенерированной папки android/.
 * Папка android/ в git не хранится — её создаёт `cap add android`,
 * поэтому патч должен быть идемпотентным и переживать пересоздание.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const cfg = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
const PKG = cfg.appId;
const JAVA = join('android/app/src/main/java', ...PKG.split('.'));
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const GRADLE = 'android/app/build.gradle';
const VARS = 'android/variables.gradle';
const ASSETS = 'android/app/src/main/assets';
const MODEL = 'native/ai/yamnet.tflite';
const MODEL_SHA = '4d8b4a53282dc83ef04e3e7dbc4fbc98082e34e44ed798e16c3a0cdd4c584faf';

const ok = m => console.log('  ✓ ' + m);
const skip = m => console.log('  – ' + m);

if (!existsSync('android')) {
  console.error('Нет папки android/. Сначала: npx cap add android');
  process.exit(1);
}

// ── 1. Плагин ────────────────────────────────────────────
mkdirSync(JAVA, { recursive: true });
const plugin = readFileSync('native/MusicScannerPlugin.java', 'utf8').replace('__PKG__', PKG);
writeFileSync(join(JAVA, 'MusicScannerPlugin.java'), plugin);
ok(`MusicScannerPlugin.java → ${JAVA}`);

const analyzer = readFileSync('native/AudioAnalyzerPlugin.java', 'utf8').replace('__PKG__', PKG);
writeFileSync(join(JAVA, 'AudioAnalyzerPlugin.java'), analyzer);
mkdirSync(ASSETS, { recursive: true });
if (!existsSync(MODEL)) {
  console.error('  ✗ нет YAMNet. Сначала: npm run model');
  process.exit(1);
}
const modelSha = createHash('sha256').update(readFileSync(MODEL)).digest('hex');
if (modelSha !== MODEL_SHA) {
  console.error(`  ✗ неверный SHA-256 YAMNet: ${modelSha}`);
  process.exit(1);
}
copyFileSync(MODEL, join(ASSETS, 'yamnet.tflite'));
copyFileSync('native/ai/YAMNET-NOTICE.md', join(ASSETS, 'YAMNET-NOTICE.md'));
ok(`AudioAnalyzerPlugin.java + YAMNet → ${ASSETS}`);

// ── 2. Регистрация в MainActivity ────────────────────────
const MAIN = join(JAVA, 'MainActivity.java');
const wantedMain = `package ${PKG};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Оба ручных плагина регистрируются до super — иначе мост их не подхватит.
        registerPlugin(MusicScannerPlugin.class);
        registerPlugin(AudioAnalyzerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
let main = readFileSync(MAIN, 'utf8');
if (main === wantedMain) {
  skip('MainActivity уже знает про оба плагина');
} else {
  main = wantedMain;
  writeFileSync(MAIN, main);
  ok('MainActivity регистрирует MusicScanner + AudioAnalyzer');
}

// ── 3. Зависимость AI и несжатая модель ──────────────────
let vars = readFileSync(VARS, 'utf8');
if (/minSdkVersion\s*=\s*(?:22|23)\b/.test(vars)) {
  vars = vars.replace(/minSdkVersion\s*=\s*(?:22|23)\b/, 'minSdkVersion = 24');
  writeFileSync(VARS, vars);
  ok('minSdkVersion поднят до 24 для MediaPipe Tasks');
} else if (!/minSdkVersion\s*=\s*(?:2[4-9]|[3-9]\d)\b/.test(vars)) {
  console.error('  ✗ не удалось гарантировать minSdkVersion >= 24');
  process.exit(1);
} else skip('minSdkVersion уже совместим с MediaPipe');

let gradle = readFileSync(GRADLE, 'utf8');
if (!gradle.includes("com.google.mediapipe:tasks-audio:0.10.35")) {
  gradle = gradle.replace('dependencies {', 'dependencies {\n    implementation "com.google.mediapipe:tasks-audio:0.10.35"');
  ok('MediaPipe Tasks Audio 0.10.35 добавлен');
} else skip('MediaPipe Tasks Audio уже добавлен');
if (!gradle.includes("noCompress 'tflite'")) {
  gradle = gradle.replace('aaptOptions {', "aaptOptions {\n             noCompress 'tflite'");
  ok('модель TFLite исключена из сжатия');
} else skip('TFLite уже исключён из сжатия');
writeFileSync(GRADLE, gradle);

// ── 4. Разрешения ────────────────────────────────────────
let man = readFileSync(MANIFEST, 'utf8');
const PERMS = `
    <!-- Android 13+ (API 33): гранулярный доступ к аудио -->
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <!-- Android 12 и ниже -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <!-- Воспроизведение в фоне: плагин media-session поднимает foreground service -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <!-- Android 13+: без него уведомление молча не покажется -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
`;
if (man.includes('READ_MEDIA_AUDIO')) {
  skip('разрешения уже на месте');
} else {
  man = man.replace('</manifest>', PERMS + '</manifest>');
  writeFileSync(MANIFEST, man);
  ok('READ_MEDIA_AUDIO + фоновое воспроизведение');
}

// ── 5. Рантайм Capacitor обязан лежать в www/ ────────────
if (!existsSync('www/capacitor.js')) {
  console.error('  ✗ нет www/capacitor.js — без него registerPlugin недоступен и натив мёртв.');
  console.error('    cp node_modules/@capacitor/core/dist/capacitor.js www/capacitor.js');
  process.exit(1);
}
const runtime = readFileSync('www/capacitor.js', 'utf8');
const runtimeMiss = ['registerPlugin', 'isNativePlatform', 'convertFileSrc'].filter(x => !runtime.includes(x));
if (runtimeMiss.length) {
  console.error('  ✗ www/capacitor.js неполный: ' + runtimeMiss.join(', '));
  process.exit(1);
}
ok('рантайм Capacitor на месте');

// ── 6. Проверка ──────────────────────────────────────────
const need = ['READ_MEDIA_AUDIO', 'READ_EXTERNAL_STORAGE', 'POST_NOTIFICATIONS', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK'];
const miss = need.filter(p => !readFileSync(MANIFEST, 'utf8').includes(p));
if (miss.length) { console.error('  ✗ не хватает: ' + miss.join(', ')); process.exit(1); }
const mainCheck = readFileSync(MAIN, 'utf8');
if (!mainCheck.includes('MusicScannerPlugin.class') || !mainCheck.includes('AudioAnalyzerPlugin.class')) {
  console.error('  ✗ ручные плагины не зарегистрированы'); process.exit(1);
}
if (!readFileSync(GRADLE, 'utf8').includes('tasks-audio:0.10.35')) { console.error('  ✗ нет MediaPipe Tasks Audio'); process.exit(1); }
if (!/minSdkVersion\s*=\s*(?:2[4-9]|[3-9]\d)\b/.test(readFileSync(VARS, 'utf8'))) { console.error('  ✗ minSdkVersion ниже 24'); process.exit(1); }
if (!existsSync(join(ASSETS, 'yamnet.tflite'))) { console.error('  ✗ нет модели YAMNet'); process.exit(1); }
console.log('\nНатив на месте.');
