package __PKG__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OutputGuard")
public class OutputGuardPlugin extends Plugin {
    private boolean registered;

    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) return;
            getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(
                    "if(localStorage.getItem('n54_media3_enabled')!=='1'&&typeof pause==='function'){pause();if(typeof toast==='function')toast('НАУШНИКИ ОТКЛЮЧЕНЫ // ПАУЗА')}" , null));
            JSObject data = new JSObject();
            data.put("reason", "outputDisconnected");
            notifyListeners("disconnected", data, true);
        }
    };

    @Override
    public void load() {
        super.load();
        IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
        registered = true;
    }

    @Override
    protected void handleOnDestroy() {
        if (registered) {
            try { getContext().unregisterReceiver(receiver); }
            catch (Exception ignored) {}
            registered = false;
        }
        super.handleOnDestroy();
    }
}
