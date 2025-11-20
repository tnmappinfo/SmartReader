import UIKit
import PDFKit
import AVFoundation
import NaturalLanguage

final class PDFReaderViewController: UIViewController, AVSpeechSynthesizerDelegate {
    
    weak var ownerView: PdfReaderView? // 👈 so we can call back to Expo View
    
    // MARK: - UI
    private let pdfView = PDFView()
    private let bottomBar = UIView()
    private let playPauseButton = UIButton(type: .system)
    private let speedButton = UIButton(type: .system)
    private let voiceButton = UIButton(type: .system)
    private let bookmarkButton = UIButton(type: .system)
    private let notesButton = UIButton(type: .system)
    private let progressView = UIProgressView(progressViewStyle: .default)
    private let pageNumberLabel = UILabel()
    
    // MARK: - TTS / State
    private let synthesizer = AVSpeechSynthesizer()
    private var isPlaying = false
    private var isResetPlayer = false
    
    private struct SentenceItem {
        let page: PDFPage
        let text: String
        let range: NSRange   // range in page.string
    }
    
    private var items: [SentenceItem] = []
    private var currentIndex: Int = 0
    private var currentHighlights: [PDFAnnotation] = []
    
    // Settings
    private var voiceMale = true
    private var speedFactor: Float = 1.0 // 0.75–2.0x UI factor
    
    var screenTitle: String = "PDF Viewer"
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        synthesizer.delegate = self
        
        setupPDFView()
        setupBottomBar()
        //        loadDocumentAndIndexSentences() //It is calling from react native
        updateProgressBar()
        setupCloseButton()
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(pageChanged),
            name: Notification.Name.PDFViewPageChanged,
            object: pdfView
        )
        self.pageChanged()
    }
    
    private func setupCloseButton() {
        let closeButton = UIBarButtonItem(
            title: "Close",
            style: .done,
            target: self,
            action: #selector(closePressed)
        )
        navigationItem.rightBarButtonItem = closeButton
    }
    
    @objc private func closePressed() {
        self.dismiss(animated: true)
    }
    @objc private func pageChanged() {
        guard let page = pdfView.currentPage,
              let doc = pdfView.document else { return }
        let index = doc.index(for: page) + 1
        let total = doc.pageCount
        pageNumberLabel.text = "\(index) / \(total)"
        print("\(index) / \(total)")
    }
    
    // MARK: - Setup
    private func setupPDFView() {
        pdfView.translatesAutoresizingMaskIntoConstraints = false
        pdfView.autoScales = true
        //        pdfView.displayMode = .singlePageContinuous
        //        pdfView.displayDirection = .vertical
        pdfView.displayMode = .singlePage
        pdfView.displayDirection = .horizontal
        pdfView.usePageViewController(true)
        
        view.addSubview(pdfView)
        
        NSLayoutConstraint.activate([
            pdfView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            pdfView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            pdfView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            pdfView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -96)
        ])
    }
    
    //    private func setupBottomBar() {
    //        bottomBar.translatesAutoresizingMaskIntoConstraints = false
    //        bottomBar.backgroundColor = UIColor(red: 30/255, green: 58/255, blue: 138/255, alpha: 1.0) // theme blue
    //        view.addSubview(bottomBar)
    //
    //        NSLayoutConstraint.activate([
    //            bottomBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
    //            bottomBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
    //            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
    //            bottomBar.heightAnchor.constraint(equalToConstant: 70)
    //        ])
    //
    //        // Common button styling
    //        func styleButton(_ button: UIButton, title: String) {
    //            button.setTitle(title, for: .normal)
    //            button.setTitleColor(.white, for: .normal)
    //            button.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
    //        }
    //
    //        styleButton(playPauseButton, title: "▶︎ Play")
    //        playPauseButton.addTarget(self, action: #selector(togglePlayPause), for: .touchUpInside)
    //
    //        styleButton(speedButton, title: "⏩ 1.0×")
    //        speedButton.addTarget(self, action: #selector(selectSpeed), for: .touchUpInside)
    //
    //        styleButton(voiceButton, title: "🗣 Male")
    //        voiceButton.addTarget(self, action: #selector(toggleVoice), for: .touchUpInside)
    //
    //        styleButton(notesButton, title: "📝 Notes")
    //        notesButton.addTarget(self, action: #selector(addNote), for: .touchUpInside)
    //
    //        // Stack of buttons
    //        let row = UIStackView(arrangedSubviews: [playPauseButton, speedButton, voiceButton, notesButton])
    //        row.axis = .horizontal
    //        row.spacing = 16
    //        row.alignment = .center
    //        row.distribution = .fillEqually
    //        row.translatesAutoresizingMaskIntoConstraints = false
    //
    //        progressView.translatesAutoresizingMaskIntoConstraints = false
    //        progressView.progressTintColor = .white
    //        progressView.trackTintColor = UIColor.white.withAlphaComponent(0.5)
    //        progressView.layer.cornerRadius = 2
    //        progressView.clipsToBounds = true
    //
    //        bottomBar.addSubview(row)
    //        bottomBar.addSubview(progressView)
    //
    //        NSLayoutConstraint.activate([
    //            // Progress bar at top
    //            progressView.topAnchor.constraint(equalTo: bottomBar.topAnchor, constant: 8),
    //            progressView.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 12),
    //            progressView.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -12),
    //            progressView.heightAnchor.constraint(equalToConstant: 4),
    //
    //            // Row of buttons slightly shifted up
    //            row.topAnchor.constraint(equalTo: progressView.bottomAnchor, constant: 4), // was 8 → now 4
    //            row.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 12),
    //            row.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -12),
    //            row.bottomAnchor.constraint(equalTo: bottomBar.bottomAnchor, constant: -3) // was -8 → now -3
    //        ])
    //
    //        pageNumberLabel.translatesAutoresizingMaskIntoConstraints = false
    //        pageNumberLabel.backgroundColor = UIColor.black.withAlphaComponent(0.5)
    //        pageNumberLabel.textColor = .white
    //        pageNumberLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
    //        pageNumberLabel.textAlignment = .center
    //        pageNumberLabel.layer.cornerRadius = 8
    //        pageNumberLabel.clipsToBounds = true
    //
    //        view.addSubview(pageNumberLabel)
    //
    //        NSLayoutConstraint.activate([
    //            pageNumberLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
    //            pageNumberLabel.bottomAnchor.constraint(equalTo: pdfView.bottomAnchor, constant: -16),
    //            pageNumberLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 50),
    //            pageNumberLabel.heightAnchor.constraint(equalToConstant: 28)
    //        ])
    //    }
    
    private func setupBottomBar() {
        bottomBar.translatesAutoresizingMaskIntoConstraints = false
        bottomBar.backgroundColor = UIColor(red: 37/255, green: 100/255, blue: 235/255, alpha: 1.0) // theme blue
        view.addSubview(bottomBar)
        
        NSLayoutConstraint.activate([
            bottomBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            //            bottomBar.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            bottomBar.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            bottomBar.heightAnchor.constraint(equalToConstant: 90) // increased height for vertical icons + text
        ])
        
        
        
        // Buttons
        let restartButton = UIButton(type: .system)
        styleButton(restartButton, icon: "🔄", title: "Restart")
        restartButton.addTarget(self, action: #selector(restartReading), for: .touchUpInside)
        
        styleButton(playPauseButton, icon: "▶️", title: "Play")
        playPauseButton.addTarget(self, action: #selector(togglePlayPause), for: .touchUpInside)
        
        styleButton(speedButton, icon: "⏩", title: "1×")
        speedButton.addTarget(self, action: #selector(selectSpeed), for: .touchUpInside)
        
        styleButton(voiceButton, icon: "👨", title: "Male")
        voiceButton.addTarget(self, action: #selector(toggleVoice), for: .touchUpInside)
        
        styleButton(notesButton, icon: "📝", title: "Notes")
        notesButton.addTarget(self, action: #selector(addNote), for: .touchUpInside)
        
        // Stack of buttons
        let row = UIStackView(arrangedSubviews: [restartButton, playPauseButton, speedButton, voiceButton, notesButton])
        row.axis = .horizontal
        row.spacing = 0
        row.alignment = .center
        row.distribution = .fillEqually
        row.translatesAutoresizingMaskIntoConstraints = false
        
        progressView.translatesAutoresizingMaskIntoConstraints = false
        progressView.progressTintColor = .white
        progressView.trackTintColor = UIColor.white.withAlphaComponent(0.5)
        progressView.layer.cornerRadius = 2
        progressView.clipsToBounds = true
        
        bottomBar.addSubview(row)
        bottomBar.addSubview(progressView)
        
        NSLayoutConstraint.activate([
            // Progress bar at top
            progressView.topAnchor.constraint(equalTo: bottomBar.topAnchor, constant: 8),
            progressView.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 12),
            progressView.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -12),
            progressView.heightAnchor.constraint(equalToConstant: 4),
            
            // Row of buttons
            row.topAnchor.constraint(equalTo: progressView.bottomAnchor, constant: 4),
            row.leadingAnchor.constraint(equalTo: bottomBar.leadingAnchor, constant: 4),
            row.trailingAnchor.constraint(equalTo: bottomBar.trailingAnchor, constant: -4),
            row.bottomAnchor.constraint(equalTo: bottomBar.bottomAnchor, constant: -4)
        ])
        
        // Page number overlay
        pageNumberLabel.translatesAutoresizingMaskIntoConstraints = false
        pageNumberLabel.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        pageNumberLabel.textColor = .white
        pageNumberLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        pageNumberLabel.textAlignment = .center
        pageNumberLabel.layer.cornerRadius = 8
        pageNumberLabel.clipsToBounds = true
        
        view.addSubview(pageNumberLabel)
        
        NSLayoutConstraint.activate([
            pageNumberLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            pageNumberLabel.bottomAnchor.constraint(equalTo: pdfView.bottomAnchor, constant: -16),
            pageNumberLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 50),
            pageNumberLabel.heightAnchor.constraint(equalToConstant: 28)
        ])
    }
    
    func styleButton(_ button: UIButton, icon: String, title: String) {
        let text = "\(icon)\n\(title)"
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        paragraphStyle.lineSpacing = 4 // increase line spacing
        
        let attributedString = NSAttributedString(
            string: text,
            attributes: [
                .font: UIFont.systemFont(ofSize: 14, weight: .medium),
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraphStyle
            ]
        )
        
        button.setAttributedTitle(attributedString, for: .normal)
        button.contentHorizontalAlignment = .center
        button.contentVerticalAlignment = .center
        button.titleLabel?.numberOfLines = 0   // ✅ allow multiple lines
        button.titleLabel?.lineBreakMode = .byWordWrapping
    }
    
    //loadDocumentAndIndexSentences
    func loadPDF(path: String, title: String) {
        print("loadPDF called with path: \(path)")
        self.screenTitle = title
        self.title = self.screenTitle
        
        // Convert to URL correctly
        if let url = URL(string: path), url.isFileURL {
            print("Detected local file, original URL: \(url)")
            
            // Use fileURLWithPath instead of re-stringing
            let fileURL = URL(fileURLWithPath: url.path)
            print("Normalized fileURL = \(fileURL.path)")
            
            if FileManager.default.fileExists(atPath: fileURL.path) {
                print("✅ File exists at path, loading PDF...")
                // Load into PDFView
                if let document = PDFDocument(url: fileURL) {
                    pdfView.document = document
                    loadDocument(doc: document)
                    self.ownerView?.onLoad(success: true, error: "Document loaded successfully.")
                } else {
                    print("❌ Failed to create PDFDocument")
                    self.ownerView?.onLoad(success: false, error: "Failed to create PDFDocument")
                }
            } else {
                print("❌ File does NOT exist at \(fileURL.path)")
                self.ownerView?.onLoad(success: false, error: "File does NOT exist at \(fileURL.path)")
            }
        } else {
            print("❌ Invalid URL: \(path)")
            self.ownerView?.onLoad(success: false, error: "Invalid URL: \(path)")
        }
    }
    
    
    
    
    func loadDocument(doc: PDFDocument) {
        
        items.removeAll()
        var pdfContent = ""
        // Build a doc-wide list of sentences with page + range
        for i in 0..<doc.pageCount {
            guard let page = doc.page(at: i), let text = page.string, !text.isEmpty else { continue }
            
            pdfContent.append(text + "\n")  // add each page’s text
            
            let tokenizer = NLTokenizer(unit: .sentence)
            tokenizer.string = text
            tokenizer.enumerateTokens(in: text.startIndex..<text.endIndex) { r, _ in
                let s = text[r].trimmingCharacters(in: .whitespacesAndNewlines)
                if !s.isEmpty {
                    let nsr = NSRange(r, in: text)
                    self.items.append(SentenceItem(page: page, text: s, range: nsr))
                }
                return true
            }
        }
        
        // Jump to first page
        if let first = doc.page(at: 0) { pdfView.go(to: first) }
        
        //Send PDF content to react native App for AI usage
        if !pdfContent.isEmpty {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                self.ownerView?.onSendContent(content: pdfContent)
            }
        }
    }
    
    func jumpToPage(pageNumber: Int) {
        DispatchQueue.main.async {
            if let doc = self.pdfView.document, pageNumber > 0, pageNumber <= doc.pageCount {
                if let page = doc.page(at: pageNumber - 1) { // 0-indexed
                    self.pdfView.go(to: page)
                }
            }
        }
    }
    
    // Jump to saved position
    func jumpToSavedPosition(index: Int) {
        DispatchQueue.main.async {
            if index < self.items.count {
                self.currentIndex = index
                let item = self.items[self.currentIndex]
                self.pdfView.go(to: item.page)
                
                // Optional: show highlight immediately
                self.showHighlight(for: item)
            }
        }
        
    }
    
    
    // MARK: - Actions
    @objc private func togglePlayPause() {
        if isPlaying {
            // Pause playback
            
            synthesizer.pauseSpeaking(at: .word)
            isPlaying = false
            //            playPauseButton.setTitle("▶️", for: .normal) // Play icon
            styleButton(playPauseButton, icon: "▶️", title: "Play")
        } else {
            // Resume or start playback
            if synthesizer.isPaused {
                synthesizer.continueSpeaking()
            } else {
                speakCurrentItem()
            }
            isPlaying = true
            //            playPauseButton.setTitle("⏸", for: .normal) // Pause icon
            styleButton(playPauseButton, icon: "⏸", title: "Pause")
        }
    }
    
    
    // MARK: - Restart player
    @objc private func restartReading() {
        // reset progress and start from beginning
        progressView.progress = 0.0
        currentIndex = 0
        
        isResetPlayer = true
        synthesizer.stopSpeaking(at: .immediate)
        let item = items[currentIndex]
        pdfView.go(to: item.page)
        
        // Optional: show highlight immediately
        showHighlight(for: item)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.restartPlaying()
        }
    }
    
    @objc func restartPlaying() {
        self.isResetPlayer = false
        isPlaying = true
        speakCurrentItem()
        styleButton(playPauseButton, icon: "⏸", title: "Pause")
    }
    
    @objc private func selectSpeed() {
        let alert = UIAlertController(title: "Playback Speed", message: nil, preferredStyle: .actionSheet)
        let options: [Float] = [0.75, 1.0, 1.25, 1.5, 2.0]
        options.forEach { f in
            alert.addAction(UIAlertAction(title: "\(f)×", style: .default, handler: { _ in
                self.speedFactor = f
                DispatchQueue.main.async {
                    //                    self.speedButton.setTitle("⏩ \(String(format: "%0.2f", f))×", for: .normal)
                    var titleStr: String = ""
                    if f.truncatingRemainder(dividingBy: 1) == 0 {
                        // It's an integer (like 1.0 or 2.0) → show without .00
                        titleStr = "\(Int(f))×"
                    } else {
                        // It's not an integer → keep up to 2 decimals
                        titleStr = "\(String(format: "%.2f", f))×"
                    }
                    self.styleButton(self.speedButton, icon: "⏩", title: titleStr)
                    
                }
                
            }))
        }
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }
    
    @objc private func toggleVoice() {
        voiceMale.toggle()
        styleButton(voiceButton, icon: voiceMale ? "👨" : "👩", title: voiceMale ? "Male" : "Female")
    }
    
    @objc private func saveBookmark() {
        let bookmark: [String: Any] = ["sentenceIndex": currentIndex, "date": Date().timeIntervalSince1970]
        UserDefaults.standard.set(bookmark, forKey: "pdf_bookmark")
        // (Optional) toast/alert
        let a = UIAlertController(title: "Bookmarked", message: "Saved your position.", preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default))
        present(a, animated: true)
    }
    
    @objc private func addNote() {
        // Prefer user's selected text; else use the current sentence
        let selected = pdfView.currentSelection?.string?.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if let snippet = selected {
            print("Send notes to event bridge: ", snippet)
            
            let pageNumber: Int = {
                if let page = pdfView.currentSelection?.pages.first as? PDFPage,
                   let doc = pdfView.document {
                    return doc.index(for: page) + 1 // +1 to make it human-readable (starts from 1)
                }
                return 1
            }()
            
            self.ownerView?.sendNoteEvent(snippet, pageNumber: pageNumber)
        } else {
            self.ownerView?.sendNoteEvent("", pageNumber: 0)
        }
        
    }
    
    // MARK: - Speaking / Highlighting
    private func speakCurrentItem() {
        guard !items.isEmpty, currentIndex < items.count else {
            isPlaying = false
            styleButton(playPauseButton, icon: "▶️", title: "Play")
            return
        }
        
        let item = items[currentIndex]
        
        // Ensure page is visible before highlighting/speaking
        ensurePageVisible(item.page) { [weak self] in
            guard let self = self else { return }
            
            // Persistent highlight (annotation) kept until sentence finishes
            self.showHighlight(for: item)
            
            let u = AVSpeechUtterance(string: item.text)
            u.rate = self.mappedRate(factor: self.speedFactor)
            //            u.voice = getVoice()
            if let v = self.selectedVoice() { u.voice = v }
            self.synthesizer.speak(u)
        }
    }
    
    private func ensurePageVisible(_ page: PDFPage, completion: @escaping () -> Void) {
        pdfView.go(to: page)
        // tiny delay lets layout settle so bounds calculations are correct
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05, execute: completion)
    }
    
    private func showHighlight(for item: SentenceItem) {
        clearHighlights()
        
        guard let selection = item.page.selection(for: item.range) else { return }
        // For wrapped sentences, create one highlight per line
        let lines = selection.selectionsByLine() ?? [selection]
        for line in lines {
            let rect = line.bounds(for: item.page)
            let anno = PDFAnnotation(bounds: rect, forType: .highlight, withProperties: nil)
            anno.color = UIColor.systemYellow.withAlphaComponent(0.45)
            item.page.addAnnotation(anno)
            currentHighlights.append(anno)
        }
        
        // Auto-scroll to first line of the sentence
        if let first = lines.first {
            let r = first.bounds(for: item.page)
            pdfView.go(to: r, on: item.page)
        }
    }
    
    private func clearHighlights() {
        currentHighlights.forEach { $0.page?.removeAnnotation($0) }
        currentHighlights.removeAll()
    }
    
    // MARK: - AVSpeechSynthesizerDelegate
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        // Clear highlight for finished sentence
        if isResetPlayer == false {
            // Clear highlight for finished sentence
            clearHighlights()
            
            // Advance
            currentIndex = min(currentIndex + 1, max(0, items.count))
            updateProgressBar()
            
            if currentIndex < items.count {
                // If next sentence is on a new page, auto-scroll & continue
                speakCurrentItem()
            } else {
                isPlaying = false
                styleButton(playPauseButton, icon: "▶️", title: "Play")
            }
        }
    }
    
    // MARK: - Progress
    private func updateProgressBar() {
        guard !items.isEmpty else { progressView.progress = 0; return }
        let progress = Float(currentIndex) / Float(items.count)
        progressView.setProgress(progress, animated: true)
    }
    
    // MARK: - Voice / Speed helpers
    private func getVoice() -> AVSpeechSynthesisVoice? {
        let voices = AVSpeechSynthesisVoice.speechVoices()
        if voiceMale {
            return voices.first { $0.name.lowercased().contains("male") }
        } else {
            return voices.first { $0.name.lowercased().contains("female") }
        }
    }
    
    private func selectedVoice() -> AVSpeechSynthesisVoice? {
        // Try common voices; fall back gracefully to language
        let maleID = "com.apple.ttsbundle.Daniel-compact"     // en-GB male (often present)
        let femaleID = "com.apple.ttsbundle.Samantha-compact" // en-US female
        let id = voiceMale ? maleID : femaleID
        return AVSpeechSynthesisVoice(identifier: id) ?? AVSpeechSynthesisVoice(language: "en-US")
    }
    
    private func mappedRate(factor: Float) -> Float {
        // Map 0.75×–2.0× around default, clamped to system min/max
        let minR = AVSpeechUtteranceMinimumSpeechRate
        let maxR = AVSpeechUtteranceMaximumSpeechRate
        let base = AVSpeechUtteranceDefaultSpeechRate
        let raw = base * factor
        return max(min(raw, maxR - 0.01), minR + 0.01)
    }
    //    self.ownerView?.sendNoteEvent(snippet, pageNumber: pageNumber)
    override func viewWillDisappear(_ animated: Bool) {
        guard let page = pdfView.currentPage,
              let doc = pdfView.document else { return }
        let index = doc.index(for: page) + 1
        self.ownerView?.sendPositionEvent(index: currentIndex, pageNumber: index)
        
    }
}
