package expo.modules.pdfreader

import android.content.Intent
import android.util.Log
import androidx.core.net.toUri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PdfReaderModule : Module() {
    // Each module class must implement the definition function. The definition consists of components
    // that describes the module's functionality and behavior.
    // See https://docs.expo.dev/modules/module-api for more details about available components.
    override fun definition() = ModuleDefinition {
        // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
        // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
        // The module will be accessible from `requireNativeModule('PdfReader')` in JavaScript.
        Name("PdfReader")

        // Defines constant property on the module.
        Constant("PI") {
            Math.PI
        }

        // Defines event names that the module can send to JavaScript.
        Events(
            "onChange",
            "onDidFinish",
            "onNoteAdd"
        )

        // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
        Function("hello") {
            "Hello world! 👋"
        }

        Function("open") { title: String,
                           uri: String,
                           pageNumber: Int,
                           isFromNotes: Boolean,
                           lastPage: Int,
                           lastSIndex: Int ->

            val activity = appContext.currentActivity ?: return@Function

            val intent = Intent(activity, PdfReaderActivity::class.java).apply {
                data = uri.toUri()
                putExtra("title", title)
                putExtra("notePageNumber", pageNumber)
                putExtra("isFromNotes", isFromNotes)
                putExtra("lastPage", lastPage)
                putExtra("lastSIndex", lastSIndex)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            PdfReaderActivityEventBridge.module = this@PdfReaderModule
            activity.startActivity(intent)
        }

        // Defines a JavaScript function that always returns a Promise and whose native code
        // is by default dispatched on the different thread than the JavaScript runtime runs on.
        AsyncFunction("setValueAsync") { value: String ->
            // Send an event to JavaScript.
            sendEvent(
                "onChange", mapOf(
                    "value" to value
                )
            )
        }

        // Enables the module to be used as a native view. Definition components that are accepted as part of
        // the view definition: Prop, Events.
        //    View(PdfReaderView::class) {
        //      // Defines a setter for the `url` prop.
        //      Prop("url") { view: PdfReaderView, url: URL ->
        //        view.webView.loadUrl(url.toString())
        //      }
        //      // Defines an event that the view can send to JavaScript.
        //      Events("onLoad")
        //    }
    }

    fun sendFinishEvent(
        lastPageNumber: Int,
        lastPageWordIndex: Int
    ) {
        sendEvent(
            "onDidFinish",
            mapOf(
                "page" to lastPageNumber,
                "sIndex" to lastPageWordIndex,
            )
        )
    }

    fun sendNoteEvent(note: String, currentPage: Int) {
        sendEvent(
            "onNoteAdd",
            mapOf(
                "note" to note,
                "page" to currentPage
            )
        )
    }
}

object PdfReaderActivityEventBridge {
    var module: PdfReaderModule? = null
    var currentActivity: PdfReaderActivity? = null
}

