package expo.modules.pdfreader;

import android.os.Build;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public class TtsSpeechRates {

    // Private static map to hold the rates
    private static final Map<String, Float> SPEECH_RATES;

    static {
        Map<String, Float> rates = new LinkedHashMap<>();
        rates.put("0.75x", 0.75f);
        rates.put("1x", 1.0f);
        rates.put("1.5x", 1.5f);
        rates.put("2x", 2.0f);

        // Make it unmodifiable so it can't be changed
        SPEECH_RATES = Collections.unmodifiableMap(rates);
    }

    // Private constructor to prevent instantiation
    private TtsSpeechRates() {}

    // Public method to get the speech rates
    public static Map<String, Float> getRates() {
        return SPEECH_RATES;
    }

    // Optional: get a specific rate by key
    public static Float getRate(String key) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return SPEECH_RATES.getOrDefault(key, 1.0f); // default = normal
        } else {
            Float rate = SPEECH_RATES.get(key);
            return rate != null ? rate : 1.0f; // default = normal
        }
    }
}
