import ExpoModulesCore

public class PdfReaderModule: Module {
    private weak var storedAppContext: AppContext?
    // Each module class must implement the definition function. The definition consists of components
    // that describes the module's functionality and behavior.
    // See https://docs.expo.dev/modules/module-api for more details about available components.
    
    // ✅ This init MUST be OUTSIDE definition()
    public required init(appContext: AppContext) {
        self.storedAppContext = appContext   // <-- save context
        super.init(appContext: appContext)
    }
    
    public func definition() -> ModuleDefinition {
        // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
        // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
        // The module will be accessible from `requireNativeModule('PdfReader')` in JavaScript.
        Name("PdfReader")
        
        Function("open") { (path: String, title: String) in
            guard let appContext = self.storedAppContext else {
                print("❌ PdfReaderModule: appContext is nil")
                return
            }

            guard let topVC = appContext.utilities?.currentViewController() else {
                print("❌ PdfReaderModule: Could not get top view controller")
                return
            }

            DispatchQueue.main.async {
                DispatchQueue.main.async {
                    let vc = PDFReaderViewController()
                    vc.modalPresentationStyle = .fullScreen
                    vc.loadPDF(path: path, title: title)
                    
                    let nav = UINavigationController(rootViewController: vc)
                    nav.modalPresentationStyle = .fullScreen
                    
                    topVC.present(nav, animated: true)
                }
            }
        }
        
       
        
        View(PdfReaderView.self) {
            // 👇 register event
            Events("onNoteAdded")
            Events("onLoad")
            Events("onPositionSaved")
            Events("didReceivePdfContent")
            
            
            Prop("filePath") { (view: PdfReaderView, filePath: String?) in
                if let filePath = filePath {
                    print("[PdfReader] Received filePath from JS: \(filePath)")
                } else {
                    print("[PdfReader] filePath from JS is nil")
                }
                view.filePath = filePath
            }
            
            // 👇 Add new function to jump to page
            Prop("pageNumber") { (view: PdfReaderView, pageNumber: Int) in
                view.pageNumber = pageNumber
            }
            
            // 👇 Add new function to jump to page
            Prop("sentenceIndex") { (view: PdfReaderView, sentenceIndex: Int) in
                view.sentenceIndex = sentenceIndex
            }
            
        }
        
        // Defines constant property on the module.
        Constant("PI") {
            Double.pi
        }
        
        // Defines event names that the module can send to JavaScript.
        Events("onChange")
        
        // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
        Function("hello") {
            return "Hello world! 👋"
        }
        
        // Defines a JavaScript function that always returns a Promise and whose native code
        // is by default dispatched on the different thread than the JavaScript runtime runs on.
        AsyncFunction("setValueAsync") { (value: String) in
            // Send an event to JavaScript.
            self.sendEvent("onChange", [
                "value": value
            ])
        }
    }
    
    
}
