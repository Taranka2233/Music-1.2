#!/usr/bin/env node
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';

const cfg=JSON.parse(readFileSync('capacitor.config.json','utf8'));
const PKG=cfg.appId;
const JAVA=join('android/app/src/main/java',...PKG.split('.'));
const RES='android/app/src/main/res';

for(const name of ['OutputGuardPlugin.java','N54CommandBridge2.java']){
  const src=join('native',name),dst=join(JAVA,name);
  if(!existsSync(src)) throw new Error('Missing '+src);
  writeFileSync(dst,readFileSync(src,'utf8').replaceAll('__PKG__',PKG));
}

const mainPath=join(JAVA,'MainActivity.java');
let main=readFileSync(mainPath,'utf8');
if(!main.includes('OutputGuardPlugin.class')){
  main=main.replace('registerPlugin(HomeWidgetPlugin.class);',
    'registerPlugin(OutputGuardPlugin.class);\n        registerPlugin(HomeWidgetPlugin.class);');
}
writeFileSync(mainPath,main);
if(!main.includes('OutputGuardPlugin.class')) throw new Error('OutputGuardPlugin is not registered');
if(main.includes('AudioGuardPlugin.class')) throw new Error('Removed AudioGuardPlugin is still registered');

const resources=[
  ['native/widget/n54_widget_compact.xml',join(RES,'layout/n54_widget.xml')],
  ['native/widget/n54_widget_expanded.xml',join(RES,'layout/n54_widget_expanded.xml')],
  ['native/widget/n54_widget_bg.xml',join(RES,'drawable/n54_widget_bg.xml')],
  ['native/widget/n54_widget_info.xml',join(RES,'xml/n54_widget_info.xml')]
];
for(const [src,dst] of resources){
  if(!existsSync(src)) throw new Error('Missing '+src);
  mkdirSync(dirname(dst),{recursive:true});
  writeFileSync(dst,readFileSync(src,'utf8'));
}

const providerPath=join(JAVA,'N54WidgetProvider.java');
const provider=readFileSync(providerPath,'utf8');
for(const marker of ['N54CommandBridge2.route','ACTION_FAVORITE','widget_progress','n54_widget_expanded','onAppWidgetOptionsChanged']){
  if(!provider.includes(marker)) throw new Error('Adaptive widget invariant missing: '+marker);
}

console.log('✓ Output guard, targeted routing and adaptive widget resources installed');
