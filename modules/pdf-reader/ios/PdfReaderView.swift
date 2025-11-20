import ExpoModulesCore
import UIKit

// This view will be used as a native component. Make sure to inherit from `ExpoView`
// to apply the proper styling (e.g. border radius and shadows).
class PdfReaderView: ExpoView {
    
    var pdfVC: PDFReaderViewController?
    
    // ✅ Use EventDispatcher property instead of @Event
    let onNoteAdded = EventDispatcher()
    let onPositionSaved = EventDispatcher()
    let onLoad = EventDispatcher()
    let didReceivePdfContent = EventDispatcher()
    
    private var isPresented = false
    
    /*
    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        //     clipsToBounds = true
        //     delegate = WebViewDelegate { url in
        //       self.onLoad(["url": url])
        //     }
        //     webView.navigationDelegate = delegate
        //     addSubview(webView)
        let vc = PDFReaderViewController()
        self.pdfVC = vc
        vc.ownerView = self
        
        
        addSubview(vc.view)
        vc.view.frame = bounds
        
//        if let topVC = appContext?.utilities?.currentViewController() {
//            topVC.present(vc, animated: true)
//        }

        
        vc.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    }
    */
    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)

//        let vc = PDFReaderViewController()
//        self.pdfVC = vc
//        vc.ownerView = self
//
//        // 💥 Present in full screen instead of adding as subview
//        if !isPresented, let topVC = appContext?.utilities?.currentViewController() {
//            isPresented = true
//            vc.modalPresentationStyle = .fullScreen
//            topVC.present(vc, animated: true)
//        }

    }

    @objc dynamic var filePath: String? {
        didSet {
            if let path = filePath, let vc = pdfVC {
                print("Path updated: \(path)")
                vc.loadPDF(path: path, title: "")
            } else {
                print("Path not found...")
                self.onLoad(success: false, error: "You must have to send filePath")
            }
        }
    }
    
    @objc dynamic var pageNumber: Int = 0 {
        didSet {
            if pageNumber > 0, let vc = pdfVC {
                print("Jumping to page: \(pageNumber)")
                DispatchQueue.main.async {
                    vc.jumpToPage(pageNumber: self.pageNumber)
                }
            }
        }
    }
    
    @objc dynamic var sentenceIndex: Int = 0 {
        didSet {
            if sentenceIndex > 0, let vc = pdfVC {
                print("Jumping to sentence index: \(sentenceIndex)")
                vc.jumpToSavedPosition(index: sentenceIndex)
            }
        }
    }
    
    // ✅ Correct way: use eventEmitter from appContext
    // Call this from your native code whenever a note is added
    func sendNoteEvent(_ note: String, pageNumber: Int) {
        print("note received: ", note)
        onNoteAdded([
            "note": note,
            "page": pageNumber
        ])
    }
    
    func onLoad(success: Bool, error: String) {
        onLoad([
            "success": success,
            "message": error
        ])
    }
    func sendPositionEvent(index: Int, pageNumber: Int) {
        onPositionSaved([
            "sIndex": index,
            "page": pageNumber
        ])
        
    }
    func onSendContent(content: String) {
        didReceivePdfContent([
            "content": content
        ])
    }
    
    
}
