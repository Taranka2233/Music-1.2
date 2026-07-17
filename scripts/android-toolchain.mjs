#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';

const AGP='8.12.2';
const GRADLE='8.13';
const COMPILE_SDK=36;
const ROOT='android/build.gradle';
const WRAPPER='android/gradle/wrapper/gradle-wrapper.properties';
const VARS='android/variables.gradle';
const fail=message=>{throw new Error(message)};

let root=readFileSync(ROOT,'utf8');
if(!/com\.android\.tools\.build:gradle:\d+(?:\.\d+){1,2}/.test(root))fail('Android Gradle Plugin version anchor missing');
root=root.replace(/com\.android\.tools\.build:gradle:\d+(?:\.\d+){1,2}/,'com.android.tools.build:gradle:'+AGP);
writeFileSync(ROOT,root);

let wrapper=readFileSync(WRAPPER,'utf8');
if(!/distributionUrl=.*gradle-[\d.]+-(?:all|bin)\.zip/.test(wrapper))fail('Gradle wrapper version anchor missing');
wrapper=wrapper.replace(/distributionUrl=.*gradle-[\d.]+-(?:all|bin)\.zip/,`distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE}-all.zip`);
writeFileSync(WRAPPER,wrapper);

let vars=readFileSync(VARS,'utf8');
if(!/compileSdkVersion\s*=\s*\d+/.test(vars))fail('compileSdkVersion anchor missing');
vars=vars.replace(/compileSdkVersion\s*=\s*\d+/,'compileSdkVersion = '+COMPILE_SDK);
writeFileSync(VARS,vars);

if(!readFileSync(ROOT,'utf8').includes('com.android.tools.build:gradle:'+AGP))fail('AGP upgrade failed');
if(!readFileSync(WRAPPER,'utf8').includes(`gradle-${GRADLE}-all.zip`))fail('Gradle wrapper upgrade failed');
if(!readFileSync(VARS,'utf8').includes('compileSdkVersion = '+COMPILE_SDK))fail('compileSdk upgrade failed');
console.log(`✓ Android toolchain: AGP ${AGP}, Gradle ${GRADLE}, compileSdk ${COMPILE_SDK}`);
