package __PKG__;

import android.content.Intent;

import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/**
 * Native playback owner for the staged Media3 migration.
 * The service is inert until N54Media3Plugin creates a MediaController.
 */
public final class N54PlaybackService extends MediaSessionService {
    public static final String SESSION_ID = "n54-main";

    private ExoPlayer player;
    private MediaSession mediaSession;

    private final MediaSession.Callback sessionCallback = new MediaSession.Callback() {
        @Override
        public MediaSession.ConnectionResult onConnect(
                MediaSession session, MediaSession.ControllerInfo controller) {
            if (!controller.isTrusted()) return MediaSession.ConnectionResult.reject();
            return MediaSession.Callback.super.onConnect(session, controller);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();
        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, true)
                .build();
        player.setHandleAudioBecomingNoisy(true);
        mediaSession = new MediaSession.Builder(this, player)
                .setCallback(sessionCallback)
                .build();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        if (player == null || !player.isPlaying()) stopSelf();
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.getPlayer().release();
            mediaSession.release();
            mediaSession = null;
            player = null;
        }
        super.onDestroy();
    }
}
