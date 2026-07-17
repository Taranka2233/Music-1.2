package __PKG__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.widget.RemoteViews;

import java.io.File;

public class N54WidgetProvider extends AppWidgetProvider {
    public static final String PREFS = "n54_widget";
    public static final String ACTION_TOGGLE = "net.nightcity.n54deck.widget.TOGGLE";
    public static final String ACTION_PREV = "net.nightcity.n54deck.widget.PREV";
    public static final String ACTION_NEXT = "net.nightcity.n54deck.widget.NEXT";
    public static final String ACTION_FAVORITE = "net.nightcity.n54deck.widget.FAVORITE";
    private static final int EXPANDED_MIN_HEIGHT_DP = 150;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateOne(context, manager, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager,
                                           int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions);
        updateOne(context, manager, appWidgetId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        N54CommandBridge2.route(context, intent.getAction());
    }

    private static PendingIntent command(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, N54WidgetProvider.class).setAction(action);
        return PendingIntent.getBroadcast(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context context) {
        Intent open = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 54, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static boolean isExpanded(AppWidgetManager manager, int appWidgetId) {
        Bundle options = manager.getAppWidgetOptions(appWidgetId);
        return options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 72)
                >= EXPANDED_MIN_HEIGHT_DP;
    }

    private static int layoutFor(AppWidgetManager manager, int appWidgetId) {
        return isExpanded(manager, appWidgetId)
                ? R.layout.n54_widget_expanded : R.layout.n54_widget;
    }

    private static void updateOne(Context context, AppWidgetManager manager, int appWidgetId) {
        manager.updateAppWidget(appWidgetId, buildViews(context, manager, appWidgetId));
    }

    static RemoteViews buildViews(Context context, AppWidgetManager manager, int appWidgetId) {
        boolean expanded = isExpanded(manager, appWidgetId);
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutFor(manager, appWidgetId));
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        views.setTextViewText(R.id.widget_title, prefs.getString("title", "НЕТ СИГНАЛА"));
        views.setTextViewText(R.id.widget_artist, prefs.getString("artist", "Открой N54 Audio Deck"));
        bindPlaybackState(views, prefs, expanded);

        views.setOnClickPendingIntent(R.id.widget_favorite, command(context, ACTION_FAVORITE, 50));
        views.setOnClickPendingIntent(R.id.widget_prev, command(context, ACTION_PREV, 51));
        views.setOnClickPendingIntent(R.id.widget_play, command(context, ACTION_TOGGLE, 52));
        views.setOnClickPendingIntent(R.id.widget_next, command(context, ACTION_NEXT, 53));

        PendingIntent open = openApp(context);
        views.setOnClickPendingIntent(R.id.widget_root, open);
        views.setOnClickPendingIntent(R.id.widget_cover, open);

        File cover = new File(context.getFilesDir(), "n54_widget_cover.png");
        if (cover.isFile()) {
            Bitmap bitmap = BitmapFactory.decodeFile(cover.getAbsolutePath());
            if (bitmap != null) views.setImageViewBitmap(R.id.widget_cover, bitmap);
            else views.setImageViewResource(R.id.widget_cover, R.mipmap.ic_launcher);
        } else {
            views.setImageViewResource(R.id.widget_cover, R.mipmap.ic_launcher);
        }
        return views;
    }

    private static void bindPlaybackState(RemoteViews views, SharedPreferences prefs, boolean expanded) {
        boolean playing = prefs.getBoolean("playing", false);
        boolean favorite = prefs.getBoolean("favorite", false);
        long position = prefs.getLong("positionMs", 0);
        long duration = prefs.getLong("durationMs", 0);
        int progress = duration > 0 ? (int) Math.min(1000, position * 1000 / duration) : 0;

        views.setTextViewText(R.id.widget_play, playing ? "Ⅱ" : "▶");
        views.setTextViewText(R.id.widget_favorite, favorite ? "★" : "☆");
        views.setProgressBar(R.id.widget_progress, 1000, progress, false);
        if (expanded) {
            views.setTextViewText(R.id.widget_elapsed, formatTime(position));
            long remaining = duration > position ? duration - position : 0;
            views.setTextViewText(R.id.widget_remaining, "−" + formatTime(remaining));
        }
    }

    private static String formatTime(long milliseconds) {
        long totalSeconds = Math.max(0, milliseconds / 1000);
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        if (hours > 0) return hours + ":" + two(minutes) + ":" + two(seconds);
        return minutes + ":" + two(seconds);
    }

    private static String two(long value) {
        return value < 10 ? "0" + value : Long.toString(value);
    }

    private static int[] widgetIds(Context context, AppWidgetManager manager) {
        ComponentName component = new ComponentName(context, N54WidgetProvider.class);
        return manager.getAppWidgetIds(component);
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : widgetIds(context, manager)) updateOne(context, manager, id);
    }

    public static void updatePlaybackState(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        for (int id : widgetIds(context, manager)) {
            RemoteViews views = new RemoteViews(context.getPackageName(), layoutFor(manager, id));
            bindPlaybackState(views, prefs, isExpanded(manager, id));
            manager.partiallyUpdateAppWidget(id, views);
        }
    }
}
