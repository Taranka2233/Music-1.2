package __PKG__;

import android.content.Context;
import android.content.Intent;

public final class N54CommandBridge2 {
    private N54CommandBridge2() {}

    public static boolean route(Context context, String action) {
        String command = null;
        if (N54WidgetProvider.ACTION_TOGGLE.equals(action)) command = "toggle";
        else if (N54WidgetProvider.ACTION_PREV.equals(action)) command = "previous";
        else if (N54WidgetProvider.ACTION_NEXT.equals(action)) command = "next";
        else if (action != null && action.endsWith(".FAVORITE")) command = "favorite";
        if (command == null) return false;
        if (HomeWidgetPlugin.emitCommand(command)) return true;
        context.getSharedPreferences(N54WidgetProvider.PREFS, Context.MODE_PRIVATE)
                .edit().putString("pendingCommand", command).apply();
        Intent open = new Intent(context, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        context.startActivity(open);
        return true;
    }
}