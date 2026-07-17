#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const cfg=JSON.parse(readFileSync('capacitor.config.json','utf8'));
const PKG=cfg.appId;
const JAVA=join('android/app/src/main/java',...PKG.split('.'));
const RES='android/app/src/main/res';
const MANIFEST='android/app/src/main/AndroidManifest.xml';
for(const name of ['HomeWidgetPlugin.java','N54WidgetProvider.java']){
  writeFileSync(join(JAVA,name),readFileSync(join('native',name),'utf8').replaceAll('__PKG__',PKG));
}
const mainPath=join(JAVA,'MainActivity.java');
let main=readFileSync(mainPath,'utf8');
if(!main.includes('HomeWidgetPlugin.class')) main=main.replace('registerPlugin(AudioAnalyzerPlugin.class);','registerPlugin(AudioAnalyzerPlugin.class);\n        registerPlugin(HomeWidgetPlugin.class);');
writeFileSync(mainPath,main);
for(const d of ['layout','drawable','xml']) mkdirSync(join(RES,d),{recursive:true});
writeFileSync(join(RES,'drawable/n54_widget_bg.xml'),`<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#EE181B21"/><stroke android:width="1dp" android:color="#3A404A"/><corners android:radius="24dp"/></shape>`);
writeFileSync(join(RES,'drawable/n54_widget_play.xml'),`<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval"><solid android:color="#F4E735"/></shape>`);
writeFileSync(join(RES,'layout/n54_widget.xml'),`<?xml version="1.0" encoding="utf-8"?><LinearLayout xmlns:android="http://schemas.android.com/apk/res/android" android:id="@+id/widget_root" android:layout_width="match_parent" android:layout_height="match_parent" android:orientation="horizontal" android:gravity="center_vertical" android:background="@drawable/n54_widget_bg" android:padding="10dp"><ImageView android:id="@+id/widget_cover" android:layout_width="58dp" android:layout_height="58dp" android:scaleType="centerCrop" android:contentDescription="@string/app_name"/><LinearLayout android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:orientation="vertical" android:paddingStart="12dp" android:paddingEnd="6dp"><TextView android:id="@+id/widget_title" android:layout_width="match_parent" android:layout_height="wrap_content" android:maxLines="1" android:ellipsize="end" android:textColor="#F0F2F5" android:textStyle="bold" android:textSize="15sp"/><TextView android:id="@+id/widget_artist" android:layout_width="match_parent" android:layout_height="wrap_content" android:maxLines="1" android:ellipsize="end" android:textColor="#8F98A5" android:textSize="11sp" android:layout_marginTop="2dp"/></LinearLayout><TextView android:id="@+id/widget_prev" android:layout_width="42dp" android:layout_height="48dp" android:gravity="center" android:text="◀" android:textColor="#F4E735" android:textSize="20sp"/><TextView android:id="@+id/widget_play" android:layout_width="50dp" android:layout_height="50dp" android:gravity="center" android:text="▶" android:textColor="#111318" android:textSize="22sp" android:background="@drawable/n54_widget_play"/><TextView android:id="@+id/widget_next" android:layout_width="42dp" android:layout_height="48dp" android:gravity="center" android:text="▶" android:textColor="#F4E735" android:textSize="20sp"/></LinearLayout>`);
writeFileSync(join(RES,'xml/n54_widget_info.xml'),`<?xml version="1.0" encoding="utf-8"?><appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android" android:minWidth="250dp" android:minHeight="72dp" android:targetCellWidth="4" android:targetCellHeight="1" android:minResizeWidth="180dp" android:resizeMode="horizontal" android:updatePeriodMillis="0" android:initialLayout="@layout/n54_widget" android:previewLayout="@layout/n54_widget" android:widgetCategory="home_screen" android:description="@string/app_name"/>`);
let man=readFileSync(MANIFEST,'utf8');
if(!man.includes('.N54WidgetProvider')) man=man.replace('</application>',`<receiver android:name=".N54WidgetProvider" android:exported="true"><intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE"/></intent-filter><meta-data android:name="android.appwidget.provider" android:resource="@xml/n54_widget_info"/></receiver></application>`);
writeFileSync(MANIFEST,man);
for(const f of [join(JAVA,'HomeWidgetPlugin.java'),join(JAVA,'N54WidgetProvider.java'),join(RES,'layout/n54_widget.xml')]) if(!existsSync(f)) throw new Error('Widget file missing: '+f);
console.log('✓ Android home widget generated');
