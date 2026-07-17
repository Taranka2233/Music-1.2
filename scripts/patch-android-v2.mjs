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
const MEDIA3='1.10.1';
const fail=message=>{throw new Error(message)};
if(!existsSync('android'))fail('Нет android/. Сначала: npx cap add android');
const runtimePath=join(WEB_DIR,'capacitor.js');
if(!existsSync(runtimePath))fail(`Нет ${runtimePath}. Сначала: npm run build:web`);
const runtime=readFileSync(runtimePath,'utf8');
for(const marker of ['registerPlugin','isNativePlatform','convertFileSrc'])if(!runtime.includes(marker))fail('Неполный Capacitor runtime: '+marker);

mkdirSync(JAVA,{recursive:true});
for(const name of ['MusicScannerPlugin.java','AudioAnalyzerPlugin.java','N54PlaybackService.java','N54Media3Plugin.java']){
  const src=join('native',name),dst=join(JAVA,name);
  if(!existsSync(src))fail('Нет '+src);
  writeFileSync(dst,readFileSync(src,'utf8').replaceAll('__PKG__',PKG));
}
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
        registerPlugin(N54Media3Plugin.class);
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
const dependencies=[
  'implementation "com.google.mediapipe:tasks-audio:0.10.35"',
  `implementation "androidx.media3:media3-exoplayer:${MEDIA3}"`,
  `implementation "androidx.media3:media3-session:${MEDIA3}"`
];
for(const line of dependencies)if(!gradle.includes(line))gradle=gradle.replace('dependencies {','dependencies {\n    '+line);
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
if(!manifest.includes('N54PlaybackService'))manifest=manifest.replace('</application>',`
        <service
            android:name=".N54PlaybackService"
            android:exported="true"
            android:foregroundServiceType="mediaPlayback"
            android:stopWithTask="false">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
                <action android:name="android.media.browse.MediaBrowserService" />
            </intent-filter>
        </service>
    </application>`);
writeFileSync(MANIFEST,manifest);

for(const script of ['scripts/widget-android.mjs','scripts/extra-native.mjs','scripts/version-android.mjs'])execFileSync(process.execPath,[script],{stdio:'inherit'});
const main=readFileSync(MAIN,'utf8');
for(const plugin of ['MusicScannerPlugin.class','AudioAnalyzerPlugin.class','N54Media3Plugin.class','OutputGuardPlugin.class','HomeWidgetPlugin.class'])if(!main.includes(plugin))fail('Плагин не зарегистрирован: '+plugin);
if(main.includes('AudioGuardPlugin.class'))fail('Удалённый AudioGuard снова зарегистрирован');
const finalManifest=readFileSync(MANIFEST,'utf8');
for(const permission of ['READ_MEDIA_AUDIO','READ_EXTERNAL_STORAGE','POST_NOTIFICATIONS','FOREGROUND_SERVICE_MEDIA_PLAYBACK'])if(!finalManifest.includes(permission))fail('Нет разрешения: '+permission);
for(const marker of ['N54PlaybackService','androidx.media3.session.MediaSessionService','android.media.browse.MediaBrowserService'])if(!finalManifest.includes(marker))fail('Media3 service invariant отсутствует: '+marker);
const finalGradle=readFileSync(GRADLE,'utf8');
for(const marker of ['tasks-audio:0.10.35',`media3-exoplayer:${MEDIA3}`,`media3-session:${MEDIA3}`])if(!finalGradle.includes(marker))fail('Dependency отсутствует: '+marker);
if(!existsSync(join(ASSETS,'yamnet.tflite')))fail('YAMNet не скопирован');
console.log(`✓ Android native layer generated from immutable dist; Media3 ${MEDIA3} staged`);
