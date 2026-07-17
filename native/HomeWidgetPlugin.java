package __PKG__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(name = "HomeWidget")
public class HomeWidgetPlugin extends Plugin {
    private static final int MAX_ART_DATA_CHARS = 8_000_000;
    private static volatile HomeWidgetPlugin live;

    @Override
    public void load() {
        super.load();
        live = this;
    }

    public static boolean emitCommand(String command) {
        HomeWidgetPlugin plugin = live;
        if (plugin == null) return false;
        JSObject data = new JSObject();
        data.put("command", command);
        plugin.notifyListeners("command", data, true);
        return true;
    }

    @PluginMethod
    public void consumePending(PluginCall call) {
        SharedPreferences prefs = prefs();
        String command = prefs.getString("pendingCommand", "");
        if (!command.isEmpty()) prefs.edit().remove("pendingCommand").apply();
        JSObject out = new JSObject();
        out.put("command", command);
        call.resolve(out);
    }

    @PluginMethod
    public void update(PluginCall call) {
        SharedPreferences prefs = prefs();
        JSObject data = call.getData();

        String title = call.getString("title", prefs.getString("title", "НЕТ СИГНАЛА"));
        String artist = call.getString("artist", prefs.getString("artist", "N54 Audio Deck"));
        boolean playing = data.has("playing") ? data.optBoolean("playing", false) : prefs.getBoolean("playing", false);
        boolean favorite = data.has("favorite") ? data.optBoolean("favorite", false) : prefs.getBoolean("favorite", false);
        long position = data.has("position") ? Math.max(0, Math.round(data.optDouble("position", 0) * 1000)) : prefs.getLong("positionMs", 0);
        long duration = data.has("duration") ? Math.max(0, Math.round(data.optDouble("duration", 0) * 1000)) : prefs.getLong("durationMs", 0);

        String metadataSignature = title + '\n' + artist;
        String stateSignature = playing + "\n" + favorite + "\n" + (position / 5000) + "\n" + duration;
        boolean metadataChanged = !metadataSignature.equals(prefs.getString("metadataSignature", ""));
        boolean stateChanged = !stateSignature.equals(prefs.getString("stateSignature", ""));

        String artUri = call.getString("artUri", "");
        String artData = call.getString("artData", "");
        int incomingArtKey = !artData.isEmpty() ? artData.hashCode()
                : !artUri.isEmpty() ? artUri.hashCode() : prefs.getInt("artKey", 0);
        boolean artworkChanged = false;
        if (incomingArtKey != prefs.getInt("savedArtKey", 0)) {
            if (!artData.isEmpty() && artData.length() <= MAX_ART_DATA_CHARS) {
                artworkChanged = saveDataArtwork(artData);
            } else if (!artUri.isEmpty()) {
                artworkChanged = saveUriArtwork(artUri);
            }
        }

        SharedPreferences.Editor editor = prefs.edit()
                .putString("title", title).putString("artist", artist)
                .putBoolean("playing", playing).putBoolean("favorite", favorite)
                .putLong("positionMs", position).putLong("durationMs", duration)
                .putString("metadataSignature", metadataSignature)
                .putString("stateSignature", stateSignature)
                .putInt("artKey", incomingArtKey);
        if (artworkChanged) editor.putInt("savedArtKey", incomingArtKey);
        editor.apply();

        if (metadataChanged || artworkChanged) {
            N54WidgetProvider.updateAll(getContext());
        } else if (stateChanged) {
            N54WidgetProvider.updatePlaybackState(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        File cover = new File(getContext().getFilesDir(), "n54_widget_cover.png");
        if (cover.exists()) cover.delete();
        prefs().edit().clear().apply();
        N54WidgetProvider.updateAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void requestPin(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            result.put("supported", false);
            result.put("requested", false);
            call.resolve(result);
            return;
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        ComponentName provider = new ComponentName(getContext(), N54WidgetProvider.class);
        boolean supported = manager.isRequestPinAppWidgetSupported();
        boolean requested = false;
        if (supported) {
            Intent success = new Intent(getContext(), MainActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent callback = PendingIntent.getActivity(getContext(), 77, success,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            requested = manager.requestPinAppWidget(provider, null, callback);
        }
        result.put("supported", supported);
        result.put("requested", requested);
        call.resolve(result);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(N54WidgetProvider.PREFS, Context.MODE_PRIVATE);
    }

    private boolean saveUriArtwork(String value) {
        try (InputStream in = getContext().getContentResolver().openInputStream(Uri.parse(value))) {
            return in != null && saveBitmap(BitmapFactory.decodeStream(in));
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean saveDataArtwork(String value) {
        try {
            int comma = value.indexOf(',');
            byte[] bytes = Base64.decode(comma >= 0 ? value.substring(comma + 1) : value, Base64.DEFAULT);
            return saveBitmap(BitmapFactory.decodeByteArray(bytes, 0, bytes.length));
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean saveBitmap(Bitmap bitmap) {
        if (bitmap == null) return false;
        Bitmap scaled = null;
        boolean saved = false;
        try {
            scaled = Bitmap.createScaledBitmap(bitmap, 256, 256, true);
            try (FileOutputStream stream = new FileOutputStream(
                    new File(getContext().getFilesDir(), "n54_widget_cover.png"))) {
                saved = scaled.compress(Bitmap.CompressFormat.PNG, 90, stream);
            }
        } catch (Exception ignored) {
            saved = false;
        } finally {
            if (scaled != null && scaled != bitmap && !scaled.isRecycled()) scaled.recycle();
            if (!bitmap.isRecycled()) bitmap.recycle();
        }
        return saved;
    }

    @Override
    protected void handleOnDestroy() {
        if (live == this) live = null;
        super.handleOnDestroy();
    }
}
