package __PKG__;

import android.content.ComponentName;
import android.net.Uri;

import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "N54Media3")
public final class N54Media3Plugin extends Plugin {
    public static final String MEDIA3_VERSION = "1.10.1";
    private static final String CONTENT_PROXY = "/_capacitor_content_";
    private static final String FILE_PROXY = "/_capacitor_file_";

    private ListenableFuture<MediaController> controllerFuture;
    private MediaController controller;

    private static final class QueueBuild {
        final List<MediaItem> items = new ArrayList<>();
        int inputCount;
        int rejected;
        int targetIndex;
    }

    private final Player.Listener listener = new Player.Listener() {
        @Override
        public void onEvents(Player player, Player.Events events) {
            emitState();
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            JSObject data = new JSObject();
            data.put("code", error.errorCode);
            data.put("message", error.getMessage());
            notifyListeners("error", data, true);
        }
    };

    @PluginMethod
    public void probe(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", true);
        out.put("connected", controller != null);
        out.put("version", MEDIA3_VERSION);
        out.put("sessionId", N54PlaybackService.SESSION_ID);
        call.resolve(out);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        if (controller != null) {
            call.resolve(state());
            return;
        }
        if (controllerFuture != null) {
            call.reject("Media3 controller is already connecting");
            return;
        }
        SessionToken token = new SessionToken(
                getContext(), new ComponentName(getContext(), N54PlaybackService.class));
        ListenableFuture<MediaController> future =
                new MediaController.Builder(getContext(), token).buildAsync();
        controllerFuture = future;
        future.addListener(() -> {
            if (controllerFuture != future) return;
            try {
                controller = future.get();
                controller.addListener(listener);
                controllerFuture = null;
                call.resolve(state());
                emitState();
            } catch (Exception error) {
                controllerFuture = null;
                call.reject("Unable to connect Media3", error);
            }
        }, ContextCompat.getMainExecutor(getContext()));
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        releaseController();
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        if (!requireController(call)) return;
        call.resolve(state());
    }

    @PluginMethod
    public void validateQueue(PluginCall call) {
        JSArray input = call.getArray("items");
        if (input == null || input.length() == 0) {
            call.reject("Media3 queue is empty");
            return;
        }
        try {
            QueueBuild queue = buildQueue(input, call.getInt("index", 0));
            JSObject out = new JSObject();
            out.put("input", queue.inputCount);
            out.put("accepted", queue.items.size());
            out.put("rejected", queue.rejected);
            out.put("index", queue.items.isEmpty() ? -1 : queue.targetIndex);
            out.put("mediaId", queue.items.isEmpty() ? ""
                    : queue.items.get(queue.targetIndex).mediaId);
            out.put("playbackStarted", false);
            call.resolve(out);
        } catch (Exception error) {
            call.reject("Invalid Media3 queue", error);
        }
    }

    @PluginMethod
    public void setQueue(PluginCall call) {
        if (!requireController(call)) return;
        JSArray input = call.getArray("items");
        if (input == null || input.length() == 0) {
            call.reject("Media3 queue is empty");
            return;
        }
        try {
            QueueBuild queue = buildQueue(input, call.getInt("index", 0));
            if (queue.items.isEmpty()) {
                call.reject("Media3 queue has no native playable URI");
                return;
            }
            long positionMs = Math.max(0L, Math.round(call.getDouble("position", 0.0) * 1000.0));
            boolean play = call.getBoolean("play", false);
            controller.setMediaItems(queue.items, queue.targetIndex, positionMs);
            controller.prepare();
            controller.setPlayWhenReady(play);
            call.resolve(state());
        } catch (Exception error) {
            call.reject("Invalid Media3 queue", error);
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        if (!requireController(call)) return;
        controller.play();
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (!requireController(call)) return;
        controller.pause();
        call.resolve();
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        if (!requireController(call)) return;
        controller.seekTo(Math.max(0L, Math.round(call.getDouble("position", 0.0) * 1000.0)));
        call.resolve();
    }

    @PluginMethod
    public void next(PluginCall call) {
        if (!requireController(call)) return;
        controller.seekToNextMediaItem();
        call.resolve();
    }

    @PluginMethod
    public void previous(PluginCall call) {
        if (!requireController(call)) return;
        controller.seekToPreviousMediaItem();
        call.resolve();
    }

    @PluginMethod
    public void setOptions(PluginCall call) {
        if (!requireController(call)) return;
        controller.setShuffleModeEnabled(call.getBoolean("shuffle", controller.getShuffleModeEnabled()));
        String repeat = call.getString("repeat", "off");
        controller.setRepeatMode("one".equals(repeat) ? Player.REPEAT_MODE_ONE
                : "all".equals(repeat) ? Player.REPEAT_MODE_ALL : Player.REPEAT_MODE_OFF);
        float speed = (float) Math.max(0.25, Math.min(3.0, call.getDouble("speed", 1.0)));
        controller.setPlaybackParameters(new PlaybackParameters(speed));
        float volume = (float) Math.max(0.0, Math.min(1.0, call.getDouble("volume", 1.0)));
        controller.setVolume(volume);
        call.resolve(state());
    }

    private QueueBuild buildQueue(JSArray input, int requestedIndex) throws Exception {
        QueueBuild queue = new QueueBuild();
        queue.inputCount = input.length();
        int safeRequested = Math.max(0, Math.min(input.length() - 1, requestedIndex));
        int acceptedBeforeTarget = 0;
        String requestedId = input.getJSONObject(safeRequested).optString("id", "");
        boolean targetFound = false;

        for (int i = 0; i < input.length(); i++) {
            JSONObject row = input.getJSONObject(i);
            String uriValue = row.optString("uri", "");
            Uri mediaUri = normalizeUri(uriValue);
            if (mediaUri == null) {
                queue.rejected++;
                continue;
            }
            String id = row.optString("id", uriValue);
            if (i < safeRequested) acceptedBeforeTarget++;
            MediaMetadata.Builder metadata = new MediaMetadata.Builder()
                    .setTitle(row.optString("title", "Без названия"))
                    .setArtist(row.optString("artist", "Неизвестный"))
                    .setAlbumTitle(row.optString("album", "N54 Audio Deck"));
            Uri artworkUri = normalizeUri(row.optString("artworkUri", ""));
            if (artworkUri != null) metadata.setArtworkUri(artworkUri);
            queue.items.add(new MediaItem.Builder()
                    .setMediaId(id)
                    .setUri(mediaUri)
                    .setMediaMetadata(metadata.build())
                    .build());
            if (!targetFound && !requestedId.isEmpty() && requestedId.equals(id)) {
                queue.targetIndex = queue.items.size() - 1;
                targetFound = true;
            }
        }
        if (!queue.items.isEmpty() && !targetFound) {
            queue.targetIndex = Math.max(0,
                    Math.min(queue.items.size() - 1, acceptedBeforeTarget));
        }
        return queue;
    }

    private Uri normalizeUri(String value) {
        if (value == null || value.isEmpty()) return null;
        Uri parsed = Uri.parse(value);
        String path = parsed.getPath();
        if (path != null && path.startsWith(CONTENT_PROXY)) {
            return Uri.parse("content:" + path.substring(CONTENT_PROXY.length()));
        }
        if (path != null && path.startsWith(FILE_PROXY)) {
            return Uri.parse("file://" + path.substring(FILE_PROXY.length()));
        }
        String scheme = parsed.getScheme();
        if (scheme == null || "blob".equalsIgnoreCase(scheme)) return null;
        return parsed;
    }

    private boolean requireController(PluginCall call) {
        if (controller != null) return true;
        call.reject("Media3 controller is not connected");
        return false;
    }

    private JSObject state() {
        JSObject out = new JSObject();
        out.put("connected", controller != null);
        out.put("version", MEDIA3_VERSION);
        if (controller == null) return out;
        MediaItem item = controller.getCurrentMediaItem();
        out.put("mediaId", item == null ? "" : item.mediaId);
        out.put("index", controller.getCurrentMediaItemIndex());
        out.put("position", controller.getCurrentPosition() / 1000.0);
        out.put("duration", Math.max(0, controller.getDuration()) / 1000.0);
        out.put("playing", controller.isPlaying());
        out.put("playWhenReady", controller.getPlayWhenReady());
        out.put("playbackState", controller.getPlaybackState());
        out.put("shuffle", controller.getShuffleModeEnabled());
        out.put("repeatMode", controller.getRepeatMode());
        out.put("speed", controller.getPlaybackParameters().speed);
        out.put("volume", controller.getVolume());
        return out;
    }

    private void emitState() {
        if (controller != null) notifyListeners("state", state(), true);
    }

    private void releaseController() {
        if (controller != null) {
            controller.removeListener(listener);
            controller.release();
            controller = null;
        }
        if (controllerFuture != null) {
            MediaController.releaseFuture(controllerFuture);
            controllerFuture = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        releaseController();
        super.handleOnDestroy();
    }
}
