package expo.modules.pdfreader;

import com.artifex.mupdf.fitz.Quad;

public class SelectionResult {
    public final Quad[] quads;
    public final String text;
    public SelectionResult(Quad[] quads, String text) {
        this.quads = quads;
        this.text = text;
    }
}