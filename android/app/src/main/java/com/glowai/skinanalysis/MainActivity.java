package com.glowai.skinanalysis;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        // Read API key from files/apikey.txt if present
        String apiKey = "";
        try {
            File keyFile = new File(getFilesDir(), "apikey.txt");
            if (keyFile.exists()) {
                BufferedReader r = new BufferedReader(new FileReader(keyFile));
                apiKey = r.readLine().trim();
                r.close();
            }
        } catch (Exception ignored) {}

        // Expose key to WebView via JS interface
        getBridge().getWebView().addJavascriptInterface(new KeyBridge(apiKey), "GlowNative");
    }

    static class KeyBridge {
        private final String key;
        KeyBridge(String key) { this.key = key == null ? "" : key; }

        @JavascriptInterface
        public String getApiKey() { return key; }
    }
}
