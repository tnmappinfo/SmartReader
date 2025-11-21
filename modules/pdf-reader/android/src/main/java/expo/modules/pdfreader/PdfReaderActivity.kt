package expo.modules.pdfreader

import android.app.Activity
import android.app.AlertDialog
import android.content.ContentResolver
import android.content.Intent
import android.database.Cursor
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.speech.RecognizerIntent
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.text.method.PasswordTransformationMethod
import android.util.DisplayMetrics
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RelativeLayout
import android.widget.TextView
import android.widget.Toast
import android.widget.Toolbar
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.artifex.mupdf.fitz.SeekableInputStream
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.languageid.LanguageIdentifier
import java.io.IOException
import java.text.BreakIterator
import java.util.Locale

open class PdfReaderActivity : Activity() {
    var mDisplayDPI: Int = 0
    private var mLayoutEM = 10
    private var mLayoutW = 312
    private var mLayoutH = 504

    private lateinit var mDocView: ReaderView
    private lateinit var mPasswordView: EditText
    private lateinit var mSearchTask: SearchTask
    private lateinit var mButtonsView: View
    private lateinit var mPageNumberView: TextView

    private lateinit var mAlertBuilder: AlertDialog.Builder
    private var core: MuPDFCore? = null
    private var mDocKey: String? = null
    private var mDocTitle: String? = null

    private lateinit var tts: TextToSpeech
    private var isPlaying = false
    private var lastTTSPage = 0
    private var currentPageIndex = 0
    private var currentPageWords: MutableList<String> = ArrayList()
    private var currentWordIndex = 0
    private var isReading = false

    // ========= SPEED CHANGER SETUP =========
    private val rateKeysList: List<String> = ArrayList(TtsSpeechRates.getRates().keys)
    private val rateList: List<Float> = ArrayList(TtsSpeechRates.getRates().values)
    private var currentRateIndex = 0

    private lateinit var llMediaButtons: LinearLayout
    private lateinit var tvMediaRestart: TextView
    private lateinit var tvMediaPlay: TextView
    private lateinit var tvMediaSpeed: TextView
    private lateinit var tvNotes: TextView

    // Voice command
    private lateinit var fabCommand: FloatingActionButton
    private var isCommandStarted = false

    private var selectedNotes = ""
    private var showInitialHighlight = false

    // Language ml kit
    private lateinit var languageIdentifier: LanguageIdentifier

    private val listener = TextToSpeech.OnInitListener { status ->
        if (status == TextToSpeech.SUCCESS) {
            initVoices()
            initDefaults()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        PdfReaderActivityEventBridge.currentActivity = this

        val wm = getSystemService(WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        wm.defaultDisplay.getMetrics(metrics)
        mDisplayDPI = metrics.densityDpi

        mAlertBuilder = AlertDialog.Builder(this)
        languageIdentifier = LanguageIdentification.getClient()

        val uri = intent.data
        val isFromNotes = intent.getBooleanExtra("isFromNotes", false)
        val notePageNumber = intent.getIntExtra("notePageNumber", -1)
        val lastPage = intent.getIntExtra("lastPage", -1)
        val lastSIndex = intent.getIntExtra("lastSIndex", -1)
        setDocumentUri(
            uri.toString(),
            isFromNotes,
            notePageNumber,
            lastPage,
            lastSIndex
        )
    }

    private fun setViewInsets(view: View) {
        ViewCompat.setOnApplyWindowInsetsListener(view) { v, insets ->
            val systemBarsInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(0, systemBarsInsets.top, 0, systemBarsInsets.bottom)
            insets
        }
    }

    private fun setDocumentUri(
        str: String,
        isFromNotes: Boolean,
        notePageNumber: Int,
        lastPage: Int,
        lastSIndex: Int
    ) {
        if (core == null) {

            val uri = str.toUri()
            val mimetype = "application/pdf"

            if (isFromNotes &&
                notePageNumber != -1
            ) {
                currentPageIndex = notePageNumber - 1
                showInitialHighlight = false
            } else if (lastPage != -1 &&
                lastPage != 1 &&
                lastSIndex != -1 &&
                lastSIndex != 0
            ) {
                currentPageIndex = lastPage - 1
                currentWordIndex = lastSIndex
                showInitialHighlight = true
            }

            mDocKey = uri.toString()

            Log.i(APP, "OPEN URI $uri")
            Log.i(APP, "  MAGIC (Intent) $mimetype")

            mDocTitle = null
            var size: Long = -1
            var cursor: Cursor? = null

            try {
                cursor = contentResolver.query(uri, null, null, null, null)
                if (cursor != null && cursor.moveToFirst()) {
                    var idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0 && cursor.getType(idx) == Cursor.FIELD_TYPE_STRING) mDocTitle =
                        cursor.getString(idx)

                    idx = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (idx >= 0 && cursor.getType(idx) == Cursor.FIELD_TYPE_INTEGER) size =
                        cursor.getLong(idx)

                    if (size == 0L) size = -1
                }
            } catch (x: Exception) {
                // Ignore any exception and depend on default values for title
                // and size (unless one was decoded
            } finally {
                cursor?.close()
            }

            Log.i(APP, "  NAME $mDocTitle")
            Log.i(APP, "  SIZE $size")

            try {
                core = openCore(uri, size, mimetype)
                SearchTaskResult.set(null)
            } catch (x: Exception) {
                showCannotOpenDialog(x.toString())
                return
            }

            val c = core
            if (c != null && c.needsPassword()) {
                requestPassword(c)
                return
            }
            if (c != null && c.countPages() == 0) {
                core = null
            }
        }

        if (core == null) {
            val alert = mAlertBuilder.create()
            alert.setTitle(R.string.cannot_open_document)
            alert.setButton(
                AlertDialog.BUTTON_POSITIVE, getString(R.string.dismiss)
            ) { dialog, which ->

            }
            alert.setOnCancelListener { }
            alert.show()
            return
        }

        createUI()
    }

    private fun createUI() {
        val c = core ?: return

        tts = TextToSpeech(this, listener)

        // Now create the UI.
        // First create the document view
        mDocView = object : ReaderView(this) {
            override fun onMoveToChild(i: Int) {
                currentPageIndex = i
                mPageNumberView.text = String.format(
                    Locale.ROOT,
                    "%d / %d",
                    i + 1,
                    c.countPages()
                )
                if (isPlaying) {
                    readPageText(currentPageIndex)
                }
                super.onMoveToChild(i)
            }

            override fun onTextSelected(note: String?) {
                val noteStr = note ?: return
                selectedNotes = noteStr
            }

            override fun onTapMainDocArea() {

            }

            override fun onDocMotion() {
            }

            public override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
                if (c.isReflowable) {
                    mLayoutW = w * 72 / mDisplayDPI
                    mLayoutH = h * 72 / mDisplayDPI
                    relayoutDocument()
                } else {
                    refresh()
                }
            }
        }

        mDocView.setAdapter(PageAdapter(this, c))

        mSearchTask = object : SearchTask(this, c) {
            override fun onTextFound(result: SearchTaskResult) {
                SearchTaskResult.set(result)
                // Ask the ReaderView to move to the resulting page
                mDocView.displayedViewIndex = result.pageNumber
                // Make the ReaderView act on the change to SearchTaskResult
                // via overridden onChildSetup method.
                mDocView.resetupChildren()
            }
        }


        // Make the buttons overlay, and store all its
        // controls in variables
        makeButtonsView()

        // new custom added
        tvMediaPlay.setOnClickListener { changeMediaStatus() }

        // new custom added
        tvMediaSpeed.setOnClickListener { changeSpeechRateTTS() }

        tvNotes.setOnClickListener {
            PdfReaderActivityEventBridge.module?.sendNoteEvent(selectedNotes, currentPageIndex + 1)
            selectedNotes = ""
            mDocView.resetupChildren()
        }

        tvMediaRestart.setOnClickListener { restartMedia() }

        // Create Toolbar
        val toolbar = Toolbar(this).apply {
            setBackgroundResource(R.color.primary)
            setTitleTextColor(getColor(R.color.text))
            setNavigationIcon(R.drawable.ic_arrow_back_24)
            setNavigationOnClickListener { onBackPressed() }
        }

        val titleView = TextView(this).apply {
            text = core?.title.takeIf { !it.isNullOrBlank() } ?: "PDF Companion"
            setTextColor(getColor(R.color.text))
            textSize = 18f
            setTypeface(null, Typeface.BOLD)

            val params = Toolbar.LayoutParams(
                Toolbar.LayoutParams.WRAP_CONTENT,
                Toolbar.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.START or Gravity.CENTER_VERTICAL
            }
            layoutParams = params
        }

        toolbar.addView(titleView)

        toolbar.id = View.generateViewId()
        mButtonsView.id = View.generateViewId()

        val layout = RelativeLayout(this)
        layout.setBackgroundColor(Color.DKGRAY)

        // Toolbar at top
        val toolbarParams = RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.MATCH_PARENT,
            RelativeLayout.LayoutParams.WRAP_CONTENT
        )
        layout.addView(toolbar, toolbarParams)

        // Buttons pinned at bottom
        val btnParams = RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.MATCH_PARENT,
            RelativeLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            addRule(RelativeLayout.ALIGN_PARENT_BOTTOM)
        }
        layout.addView(mButtonsView, btnParams)

        // PDF view in between
        val docParams = RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.MATCH_PARENT,
            RelativeLayout.LayoutParams.MATCH_PARENT
        ).apply {
            addRule(RelativeLayout.BELOW, toolbar.id)      // below toolbar
            addRule(RelativeLayout.ABOVE, mButtonsView.id) // above buttons
        }
        layout.addView(mDocView, docParams)

        setContentView(layout)
        setViewInsets(layout)
    }

    @Deprecated("Deprecated in Java", ReplaceWith("super.onBackPressed()", "android.app.Activity"))
    override fun onBackPressed() {
        PdfReaderActivityEventBridge.module?.sendFinishEvent(currentPageIndex + 1, currentWordIndex)
        PdfReaderActivityEventBridge.currentActivity = null
        super.onBackPressed()
    }

    private fun updatePageNumView(index: Int) {
        val c = core ?: return
        mPageNumberView.text = String.format(Locale.ROOT, "%d / %d", index + 1, c.countPages())
    }


    private fun makeButtonsView() {
        val inflater = LayoutInflater.from(this)
        mButtonsView = inflater.inflate(R.layout.buttons_view, null)
        mPageNumberView = mButtonsView.findViewById(R.id.pageNumber)

        llMediaButtons = mButtonsView.findViewById(R.id.llMediaButtons)
        tvMediaPlay = mButtonsView.findViewById(R.id.tvMediaPlay)
        tvMediaRestart = mButtonsView.findViewById(R.id.tvMediaRestart)
        tvMediaSpeed =
            mButtonsView.findViewById(R.id.tvMediaSpeed)
        tvNotes =
            mButtonsView.findViewById(R.id.tvNotes)

        // mTopBarSwitcher.visibility = View.GONE
        mPageNumberView.visibility = View.VISIBLE
        llMediaButtons.visibility = View.VISIBLE

        mDocView.displayedViewIndex = currentPageIndex
        val index = mDocView.displayedViewIndex
        updatePageNumView(index)
        initHighlights()
    }

    fun relayoutDocument() {
        val c = core ?: return
        val loc: Int = c.layout(mDocView.mCurrent, mLayoutW, mLayoutH, mLayoutEM)
        mDocView.mHistory.clear()
        mDocView.refresh()
        mDocView.displayedViewIndex = loc
    }

    @Throws(IOException::class)
    private fun openCore(uri: Uri, size: Long, mimetype: String): MuPDFCore? {
        val cr: ContentResolver = contentResolver

        Log.i(APP, "Opening document $uri")

        val `is` = cr.openInputStream(uri)
        var buf: ByteArray? = null
        var used = -1
        try {
            val limit = 8 * 1024 * 1024
            if (size < 0) { // size is unknown
                buf = ByteArray(limit)
                used = `is`!!.read(buf)
                val atEOF = `is`.read() == -1
                if (used < 0 || (used == limit && !atEOF)) // no or partial data
                    buf = null
            } else if (size <= limit) { // size is known and below limit
                buf = ByteArray(size.toInt())
                used = `is`!!.read(buf)
                if (used < 0 || used < size) // no or partial data
                    buf = null
            }
            if (buf != null && buf.size != used) {
                val newbuf = ByteArray(used)
                System.arraycopy(buf, 0, newbuf, 0, used)
                buf = newbuf
            }
        } catch (e: OutOfMemoryError) {
            buf = null
        } finally {
            `is`!!.close()
        }

        if (buf != null) {
            Log.i(APP, "  Opening document from memory buffer of size " + buf.size)
            return openBuffer(buf, mimetype)
        } else {
            Log.i(APP, "  Opening document from stream")
            return openStream(ContentInputStream(cr, uri, size), mimetype)
        }
    }

    private fun openBuffer(buffer: ByteArray, magic: String): MuPDFCore? {
        try {
            core = MuPDFCore(buffer, magic)
        } catch (e: Exception) {
            Log.e(APP, "Error opening document buffer: $e")
            return null
        }
        return core
    }

    private fun openStream(stm: SeekableInputStream, magic: String): MuPDFCore? {
        try {
            core = MuPDFCore(stm, magic)
        } catch (e: Exception) {
            Log.e(APP, "Error opening document stream: $e")
            return null
        }
        return core
    }

    private fun requestPassword(core: MuPDFCore) {
        mPasswordView = EditText(this)
        mPasswordView.inputType = EditorInfo.TYPE_TEXT_VARIATION_PASSWORD
        mPasswordView.transformationMethod = PasswordTransformationMethod()

        val alert = mAlertBuilder.create()
        alert.setTitle(R.string.enter_password)
        alert.setView(mPasswordView)
        alert.setButton(
            AlertDialog.BUTTON_POSITIVE, getString(R.string.okay)
        ) { dialog, which ->
            if (core.authenticatePassword(mPasswordView.text.toString())) {
                createUI()
            } else {
                requestPassword(core)
            }
        }
        alert.setButton(
            AlertDialog.BUTTON_NEGATIVE, getString(R.string.cancel)
        ) { dialog, which ->

        }
        alert.show()
    }

    private fun showCannotOpenDialog(reason: String) {
        val alert = mAlertBuilder.create()
        alert.setTitle(
            String.format(
                Locale.ROOT,
                getString(R.string.cannot_open_document_Reason),
                reason
            )
        )
        alert.setButton(
            AlertDialog.BUTTON_POSITIVE, getString(R.string.dismiss)
        ) { dialog, which ->
            onBackPressed()
        }
        alert.show()
    }

    // new custom added
    private fun getCurrentPageView(): PageView? {
        return mDocView.displayedView as? PageView // assumes getDisplayedView() returns current PageView
    }

    /* ====================================
     *           TTS Code
     * ==================================== */
    private fun initVoices() {
        if (::tts.isInitialized) {
            tts.language = Locale.forLanguageTag("en")
        }
    }

    private fun speakTTS(word: String) {
        if (::tts.isInitialized) {
            var languageCode = "en"
            detectLanguage(word) {
                if (it != "und") {
                    languageCode = it
                }
                Log.d(APP, "Spoken language: $languageCode")
                tts.language = Locale.forLanguageTag(languageCode)
                tts.speak(word, TextToSpeech.QUEUE_FLUSH, null, "wordId")
            }
        }
    }

    private fun initDefaults() {
        if (::tts.isInitialized) {
            // ✅ Default Speech Rate = "1x"
            currentRateIndex = rateKeysList.indexOf("1x") // make sure "1x" exists in your keys
            if (currentRateIndex < 0) currentRateIndex = 0 // fallback if not found

            val defaultRate = rateList[currentRateIndex]
            tts.setSpeechRate(defaultRate)
            tvMediaSpeed.text = rateKeysList[currentRateIndex]
        }
    }

    private fun initHighlights() {
        val c = core ?: return
        if (!showInitialHighlight) return

        val pageSentenceList: MutableList<String> = ArrayList()
        val text: String = c.getPageText(currentPageIndex)

        val iterator = BreakIterator.getSentenceInstance(Locale.getDefault())
        iterator.setText(text)
        var start = iterator.first()
        var end = iterator.next()
        while (end != BreakIterator.DONE) {
            val sentence: String = text.substring(start, end).trim { it <= ' ' }
            if (sentence.isNotEmpty()) {
                pageSentenceList.add(sentence)
            }
            start = end
            end = iterator.next()
        }

        if (pageSentenceList.isEmpty()) return

        val word = pageSentenceList[currentWordIndex]
        Handler(Looper.getMainLooper()).postDelayed({
            getCurrentPageView()?.highlightWord(word)
        }, 2000)
    }

    private fun readPageText(pageNum: Int, forceReset: Boolean = false) {
        val c = core ?: return
        stopTTS()

        val text: String = c.getPageText(pageNum) // Extract page text
//        Log.d(APP, "text pages: $text")

        // Split text into sentences
        currentPageWords.clear()
        val iterator = BreakIterator.getSentenceInstance(Locale.getDefault())
        iterator.setText(text)
        var start = iterator.first()
        var end = iterator.next()
        while (end != BreakIterator.DONE) {
            val sentence: String = text.substring(start, end).trim { it <= ' ' }
            if (sentence.isNotEmpty()) {
                currentPageWords.add(sentence)
            }
            start = end
            end = iterator.next()
        }

        if (lastTTSPage != currentPageIndex || forceReset) {
            currentWordIndex = 0
            lastTTSPage = currentPageIndex
        }
        isReading = true
        speakNextWord()
    }

    private fun onPDFSpeakCompleted() {
        speakTTS("PDF reading completed!")

        getCurrentPageView()?.clearHighlight()
        tvMediaPlay.setCompoundDrawablesWithIntrinsicBounds(
            null,
            getDrawable(R.drawable.ic_play_arrow_24),
            null,
            null
        )
        isReading = false
        isPlaying = false
        currentWordIndex = 0
        currentPageWords.clear()
    }

    private fun speakNextWord() {
        if (!isReading) return
        val c = core ?: return

//        Log.d(APP, "current page: $currentPageIndex")
//        Log.d(APP, "total pages: ${c.countPages()}")

        // Finished current page
        if (currentWordIndex >= currentPageWords.size) {
            isReading = false
            // Move to next page
            val nextPage = currentPageIndex + 1
            if (nextPage < c.countPages()) {
                mDocView.pushHistory()
                mDocView.displayedViewIndex = nextPage
                updatePageNumView((nextPage))
                readPageText(nextPage) // start reading next page
            } else {
                onPDFSpeakCompleted()
            }
            return
        }

        // Speak current sentence
        val word = currentPageWords[currentWordIndex]
        Log.d(APP, "Spoken text: $word")
        speakTTS(word)

        // highlight word on PDF
        getCurrentPageView()?.highlightWord(word)

        currentWordIndex++

        // delay callback after word is spoken
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onDone(utteranceId: String) {
                Handler(Looper.getMainLooper()).post {
                    speakNextWord()
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String) {}
            override fun onStart(utteranceId: String) {}
        })
    }

    private fun restartMedia() {
        stopTTS()
        currentPageIndex = 0
        mDocView.displayedViewIndex = currentPageIndex
        val index = mDocView.displayedViewIndex
        updatePageNumView(index)

        isPlaying = true
        tvMediaPlay.setCompoundDrawablesWithIntrinsicBounds(
            null,
            getDrawable(R.drawable.ic_pause_24),
            null,
            null
        )
        tvMediaPlay.text = "Pause"
        readPageText(currentPageIndex, forceReset = true)
    }

    private fun changeMediaStatus() {
        isPlaying = !isPlaying
        if (isPlaying) {
            tvMediaPlay.setCompoundDrawablesWithIntrinsicBounds(
                null,
                getDrawable(R.drawable.ic_pause_24),
                null,
                null
            )
            tvMediaPlay.text = "Pause"
            readPageText(currentPageIndex)
        } else {
            tvMediaPlay.setCompoundDrawablesWithIntrinsicBounds(
                null,
                getDrawable(R.drawable.ic_play_arrow_24),
                null,
                null
            )
            tvMediaPlay.text = "Play"
            stopTTS()
        }
    }

    // new custom added
    private fun changeSpeechRateTTS() {
        if (::tts.isInitialized) {
            // Move to next index (loop back to 0 if at the end)
            currentRateIndex = (currentRateIndex + 1) % rateList.size
            val currentSpeechRateString: String = rateKeysList[currentRateIndex]
            val currentSpeechRate: Float = rateList[currentRateIndex]

            // Apply new rate
            tts.setSpeechRate(currentSpeechRate)

            tvMediaSpeed.text = currentSpeechRateString

            // Optional: show toast or log
            Log.d("TTS", "Speech rate changed to: $currentSpeechRate")
        }
    }

    // new custom added
    private fun stopTTS() {
        if (::tts.isInitialized) {
            tts.stop()
        }
    }

    private fun shutDownTTS() {
        if (::tts.isInitialized) {
            tts.shutdown()
        }
    }

    /* ====================================
     *           Voice commands
     * ==================================== */
    private fun changeIconVoiceCommand() {
//        val icon = if (isCommandStarted) R.drawable.ic_close_24
//        else R.drawable.ic_voice_24
//        fabCommand.setImageResource(icon)
    }

    private fun extractPageNumber(command: String): Int? {
        // This regex looks for "page" followed by a number
        val regex = Regex("""page\s+(\d+)""", RegexOption.IGNORE_CASE)
        val matchResult = regex.find(command)
        return matchResult?.groups?.get(1)?.value?.toIntOrNull()
    }

    private fun startVoiceCommand() {
        if (isCommandStarted) return
        isCommandStarted = true
        changeIconVoiceCommand()
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        intent.putExtra(
            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
        )
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak a command...")
        startActivityForResult(intent, VOICE_RECOGNITION_REQUEST_CODE)
    }

    /* ====================================
     *           Language detection
     * ==================================== */
    fun detectLanguage(text: String, callback: (String) -> Unit) {
        languageIdentifier.identifyLanguage(text)
            .addOnSuccessListener { languageCode ->
                callback(languageCode)
            }
            .addOnFailureListener {
                callback("und")
            }
    }

    override fun onDestroy() {
        super.onDestroy()

        stopTTS()
        shutDownTTS()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == VOICE_RECOGNITION_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            val matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!matches.isNullOrEmpty()) {
                val recognizeText = matches[0]
                Log.d(APP, "recognizeText: $recognizeText")

                val pageNumber = extractPageNumber(recognizeText)
                if (pageNumber != null) {
                    Log.d(APP, "Go to page: $pageNumber")
                    val c = core ?: return
                    if (pageNumber <= c.countPages()) {
                        val index = pageNumber - 1
                        mDocView.displayedViewIndex = index
                        updatePageNumView(index)
                        Toast.makeText(
                            this,
                            "Voice command success: $recognizeText",
                            Toast.LENGTH_LONG
                        ).show()
                    } else {
                        Toast.makeText(
                            this,
                            "Voice command error: No page number found",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } else {
                    Log.d(APP, "No page number found")
                    Toast.makeText(this, "Voice command error: $recognizeText", Toast.LENGTH_LONG)
                        .show()
                }
                isCommandStarted = false
                changeIconVoiceCommand()
            }
        } else {
            isCommandStarted = false
            changeIconVoiceCommand()
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    companion object {
        private const val APP = "MuPDF"
        private const val VOICE_RECOGNITION_REQUEST_CODE = 8569
    }
}

//class PdfReaderView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
//  // Creates and initializes an event dispatcher for the `onLoad` event.
//  // The name of the event is inferred from the value and needs to match the event name defined in the module.
//  private val onLoad by EventDispatcher()
//
//  // Defines a WebView that will be used as the root subview.
//  internal val webView = WebView(context).apply {
//    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
//    webViewClient = object : WebViewClient() {
//      override fun onPageFinished(view: WebView, url: String) {
//        // Sends an event to JavaScript. Triggers a callback defined on the view component in JavaScript.
//        onLoad(mapOf("url" to url))
//      }
//    }
//  }
//
//  init {
//    // Adds the WebView to the view hierarchy.
//    addView(webView)
//  }
//}
