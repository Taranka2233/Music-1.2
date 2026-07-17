#!/usr/bin/env node
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const cfg=JSON.parse(readFileSync('capacitor.config.json','utf8'));
const PKG=cfg.appId,WEB_DIR=cfg.webDir||'dist',JAVA=join('android/app/src/main/java',...PKG.split('.'));
const MANIFEST='android/app/src/main/AndroidManifest.xml',GRADLE='android/app/build.gradle',VARS='android/variables.gradle';
const ASSETS='android/app/src/main/assets',MODEL='native/ai/yamnet.tflite';
const MODEL_SHA='4d8b4a53282dc83ef04e3e7dbc4fbc98082e34e44ed798e16c3a0cdd4c584faf';
const fail=message=>{throw new Error(message)};
if(!existsSync('android'))fail('Нет android/. Сначала: npx cap add android');
const runtimePath=join(WEB_DIR,'capacitor.js');
if(!existsSync(runtimePath))fail(`Нет ${runtimePath}. Сначала: npm run build:web`);
const runtime=readFileSync(runtimePath,'utf8');
for(const marker of ['registerPlugin','isNativePlatform','convertFileSrc'])if(!runtime.includes(marker))fail('Неполный Capacitor runtime: '+marker);

mkdirSync(JAVA,{recursive:true});
writeFileSync(join(JAVA,'MusicScannerPlugin.java'),readFileSync('native/MusicScannerPlugin.java','utf8').replace('__PKG__',PKG));
writeFileSync(join(JAVA,'AudioAnalyzerPlugin.java'),readFileSync('native/AudioAnalyzerPlugin.java','utf8').replace('__PKG__',PKG));
mkdirSync(ASSETS,{recursive:true});
if(!existsSync(MODEL))fail('Нет YAMNet. Сначала: npm run model');
const modelSha=createHash('sha256').update(readFileSync(MODEL)).digest('hex');
if(modelSha!==MODEL_SHA)fail('Неверный SHA-256 YAMNet: '+modelSha);
copyFileSync(MODEL,join(ASSETS,'yamnet.tflite'));
copyFileSync('native/ai/YAMNET-NOTICE.md',join(ASSETS,'YAMNET-NOTICE.md'));

const MAIN=join(JAVA,'MainActivity.java');
writeFileSync(MAIN,`package ${PKG};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MusicScannerPlugin.class);
        registerPlugin(AudioAnalyzerPlugin.class);
        registerPlugin(HomeWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

let vars=readFileSync(VARS,'utf8');
if(/minSdkVersion\s*=\s*(?:22|23)\b/.test(vars))vars=vars.replace(/minSdkVersion\s*=\s*(?:22|23)\b/,'minSdkVersion = 24');
if(!/minSdkVersion\s*=\s*(?:2[4-9]|[3-9]\d)\b/.test(vars))fail('minSdkVersion ниже 24');
writeFileSync(VARS,vars);

let gradle=readFileSync(GRADLE,'utf8');
if(!gradle.includes('com.google.mediapipe:tasks-audio:0.10.35'))gradle=gradle.replace('dependencies {','dependencies {\n    implementation "com.google.mediapipe:tasks-audio:0.10.35"');
if(!gradle.includes("noCompress 'tflite'"))gradle=gradle.replace('aaptOptions {',"aaptOptions {\n             noCompress 'tflite'");
writeFileSync(GRADLE,gradle);

let manifest=readFileSync(MANIFEST,'utf8');
if(!manifest.includes('READ_MEDIA_AUDIO'))manifest=manifest.replace('</manifest>',`
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
</manifest>`);
writeFileSync(MANIFEST,manifest);

for(const script of ['scripts/widget-android.mjs','scripts/extra-native.mjs','scripts/version-android.mjs'])execFileSync(process.execPath,[script],{stdio:'inherit'});
const main=readFileSync(MAIN,'utf8');
for(const plugin of ['MusicScannerPlugin.class','AudioAnalyzerPlugin.class','OutputGuardPlugin.class','HomeWidgetPlugin.class'])if(!main.includes(plugin))fail('Плагин не зарегистрирован: '+plugin);
if(main.includes('AudioGuardPlugin.class'))fail('Удалённый AudioGuard снова зарегистрирован');
for(const permission of ['READ_MEDIA_AUDIO','READ_EXTERNAL_STORAGE','POST_NOTIFICATIONS','FOREGROUND_SERVICE_MEDIA_PLAYBACK'])if(!readFileSync(MANIFEST,'utf8').includes(permission))fail('Нет разрешения: '+permission);
if(!readFileSync(GRADLE,'utf8').includes('tasks-audio:0.10.35'))fail('MediaPipe dependency отсутствует');
if(!existsSync(join(ASSETS,'yamnet.tflite')))fail('YAMNet не скопирован');
console.log('✓ Android native layer generated from immutable dist');
