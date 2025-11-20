import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import {
  Play,
  Pause,
  Square,
  Settings as SettingsIcon,
  Volume2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";
import { useColors } from "@/components/useColors";
import Header from "@/components/Header";
import { storageAPI } from "@/utils/storage";

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { pdfId } = useLocalSearchParams();
  const webViewRef = useRef(null);

  const [currentPdf, setCurrentPdf] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    language: "en",
    speed: 1,
  });
  const [loading, setLoading] = useState(true);
  const [pdfContent, setPdfContent] = useState([]);
  const [extractingText, setExtractingText] = useState(false);

  useEffect(() => {
    loadPdf();
    loadSettings();
  }, [pdfId]);

  const loadPdf = async () => {
    if (!pdfId) {
      setLoading(false);
      return;
    }

    try {
      const pdfs = await storageAPI.getPDFs();
      const pdf = pdfs.find((p) => p.id === pdfId);
      console.log("Loaded current PDF", pdf);
      setCurrentPdf(pdf);
    } catch (error) {
      console.error("Error loading PDF:", error);
      Alert.alert("Error", "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await storageAPI.getSettings();
      setSettings({
        language: savedSettings.defaultLanguage,
        speed: savedSettings.defaultSpeed,
      });
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  // Extract text from PDF using WebView
  const extractPdfText = async () => {
    if (!currentPdf?.uri || !webViewRef.current) return;

    setExtractingText(true);
    try {
      // Inject JavaScript to extract text from PDF
      const script = `
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'extractText',
          text: document.body.innerText || 'Could not extract text from this PDF'
        }));
        true;
      `;

      webViewRef.current.injectJavaScript(script);
    } catch (error) {
      console.log("Error extracting PDF text:", error);
      setPdfContent(["Error: Could not extract text from this PDF"]);
      setExtractingText(false);
    }
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "extractText") {
        // Split text into sentences for better reading experience
        const sentences = data.text
          .split(/[.!?]+/)
          .map((sentence) => sentence.trim())
          .filter((sentence) => sentence.length > 0 && sentence.length < 500) // Filter out very long or empty lines
          .slice(0, 100); // Limit to first 100 sentences

        setPdfContent(
          sentences.length > 0
            ? sentences
            : ["No readable text found in this PDF"],
        );
        setExtractingText(false);
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
      setPdfContent(["Error: Could not process PDF content"]);
      setExtractingText(false);
    }
  };

  // Real TTS implementation using WebView
  const speak = (text, options = {}) => {
    if (!webViewRef.current || !text) return;

    // Stop current speech
    const stopScript = `
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      true;
    `;
    webViewRef.current.injectJavaScript(stopScript);

    // Start new speech
    const script = `
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance("${text.replace(/"/g, '\\"')}");
        utterance.rate = ${options.rate || settings.speed};
        utterance.lang = "${options.language || settings.language}";
        
        utterance.onend = function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'speechEnd'
          }));
        };
        
        utterance.onerror = function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'speechError'
          }));
        };
        
        window.speechSynthesis.speak(utterance);
      }
      true;
    `;

    webViewRef.current.injectJavaScript(script);
  };

  // Stop speech
  const stopSpeech = () => {
    if (!webViewRef.current) return;

    const script = `
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      true;
    `;
    webViewRef.current.injectJavaScript(script);
  };

  // Enhanced WebView message handler
  const handleWebViewMessageEnhanced = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "extractText") {
        const sentences = data.text
          .split(/[.!?]+/)
          .map((sentence) => sentence.trim())
          .filter((sentence) => sentence.length > 0 && sentence.length < 500)
          .slice(0, 100);

        setPdfContent(
          sentences.length > 0
            ? sentences
            : ["No readable text found in this PDF"],
        );
        setExtractingText(false);
      } else if (data.type === "speechEnd") {
        if (isPlaying && currentLine < pdfContent.length - 1) {
          setCurrentLine((prev) => prev + 1);
          // Automatically speak next line
          setTimeout(() => {
            if (isPlaying) {
              speak(pdfContent[currentLine + 1], {
                language: settings.language,
                rate: settings.speed,
              });
            }
          }, 500);
        } else {
          setIsPlaying(false);
        }
      } else if (data.type === "speechError") {
        console.error("Speech synthesis error");
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  const getLanguageName = (code) => {
    const languages = {
      en: "English",
      hi: "Hindi",
      gu: "Gujarati",
    };
    return languages[code] || "English";
  };

  const getSpeedLabel = (speed) => {
    return `${speed}x`;
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isPlaying) {
      // Stop speaking
      setIsPlaying(false);
      stopSpeech();
    } else {
      // Start speaking
      if (pdfContent.length === 0) {
        Alert.alert("No content", "Please wait for the PDF to load");
        return;
      }
      setIsPlaying(true);
      if (currentLine < pdfContent.length) {
        speak(pdfContent[currentLine], {
          language: settings.language,
          rate: settings.speed,
        });
      }
    }
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying(false);
    setCurrentLine(0);
    stopSpeech();
  };

  const handlePreviousLine = () => {
    if (currentLine > 0) {
      setCurrentLine((prev) => prev - 1);
      stopSpeech();
      setIsPlaying(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNextLine = () => {
    if (currentLine < pdfContent.length - 1) {
      setCurrentLine((prev) => prev + 1);
      stopSpeech();
      setIsPlaying(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateLanguage = (newLanguage) => {
    setSettings((prev) => ({ ...prev, language: newLanguage }));
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    }
  };

  const updateSpeed = (newSpeed) => {
    setSettings((prev) => ({ ...prev, speed: newSpeed }));
    if (isPlaying) {
      stopSpeech();
      setIsPlaying(false);
    }
  };

  const settingsButton = (
    <TouchableOpacity
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.outline,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={() => setShowSettings(true)}
      accessibilityLabel="Audio settings"
    >
      <SettingsIcon size={20} color={colors.text} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="auto" />
        <Header
          title="Player"
          showBorder={false}
          rightComponent={settingsButton}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            Loading PDF...
          </Text>
        </View>
      </View>
    );
  }

  if (!currentPdf) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="auto" />
        <Header
          title="Player"
          showBorder={false}
          rightComponent={settingsButton}
        />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.accentLilac,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <FileText size={48} color={colors.primary} />
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: colors.text,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            No PDF Selected
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            Select a PDF from your library to start reading with text-to-speech.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="auto" />

      {/* Fixed Header */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <Header
          title="Player"
          showBorder={false}
          rightComponent={settingsButton}
        />
      </View>

      {/* PDF Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 56 + 20,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 220, // Audio controls space
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* PDF Info */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.outline,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            {currentPdf.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
            }}
          >
            {currentPdf.type === "scanned"
              ? "Scanned Document"
              : "Uploaded PDF"}
            {currentPdf.pageCount && ` • ${currentPdf.pageCount} pages`}
          </Text>
        </View>

        {/* PDF Content */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.outline,
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Reading Line {currentLine + 1} of {pdfContent.length}
          </Text>

          {pdfContent.map((line, index) => (
            <View
              key={index}
              style={{
                backgroundColor:
                  index === currentLine
                    ? colors.primaryUltraLight
                    : "transparent",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                borderWidth: index === currentLine ? 2 : 0,
                borderColor:
                  index === currentLine ? colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 24,
                  color: colors.text,
                  fontWeight: index === currentLine ? "500" : "400",
                }}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>

        {/* Current Settings Display */}
        <View
          style={{
            backgroundColor: colors.fieldFill,
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              LANGUAGE
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.text,
                fontWeight: "500",
              }}
            >
              {getLanguageName(settings.language)}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.textSecondary,
                marginBottom: 4,
              }}
            >
              SPEED
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.text,
                fontWeight: "500",
              }}
            >
              {getSpeedLabel(settings.speed)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Audio Controls */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.cardBackground,
          borderTopWidth: 1,
          borderTopColor: colors.outline,
          padding: 20,
        }}
      >
        {/* Progress */}
        <View
          style={{
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: 4,
              backgroundColor: colors.outline,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${((currentLine + 1) / pdfContent.length) * 100}%`,
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            {currentLine + 1} / {pdfContent.length}
          </Text>
        </View>

        {/* Controls */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Previous */}
          <TouchableOpacity
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.fieldFill,
              alignItems: "center",
              justifyContent: "center",
              opacity: currentLine === 0 ? 0.5 : 1,
            }}
            onPress={handlePreviousLine}
            disabled={currentLine === 0}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Stop */}
          <TouchableOpacity
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.fieldFill,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleStop}
          >
            <Square size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handlePlayPause}
          >
            {isPlaying ? (
              <Pause size={28} color={colors.background} />
            ) : (
              <Play size={28} color={colors.background} />
            )}
          </TouchableOpacity>

          {/* Volume */}
          <TouchableOpacity
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.fieldFill,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setShowSettings(true)}
          >
            <Volume2 size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.fieldFill,
              alignItems: "center",
              justifyContent: "center",
              opacity: currentLine === pdfContent.length - 1 ? 0.5 : 1,
            }}
            onPress={handleNextLine}
            disabled={currentLine === pdfContent.length - 1}
          >
            <ChevronRight size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.outline,
            }}
          >
            <View />

            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              Audio Settings
            </Text>

            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.primary,
                  fontWeight: "500",
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
          >
            {/* Language Selection */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 16,
                }}
              >
                Language
              </Text>

              {["en", "hi", "gu"].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={{
                    backgroundColor:
                      settings.language === lang
                        ? colors.primary
                        : colors.cardBackground,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor:
                      settings.language === lang
                        ? colors.primary
                        : colors.outline,
                  }}
                  onPress={() => updateLanguage(lang)}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color:
                        settings.language === lang
                          ? colors.background
                          : colors.text,
                    }}
                  >
                    {getLanguageName(lang)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Speed Selection */}
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 16,
                }}
              >
                Reading Speed
              </Text>

              {[0.5, 1, 1.5, 2].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={{
                    backgroundColor:
                      settings.speed === speed
                        ? colors.primary
                        : colors.cardBackground,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor:
                      settings.speed === speed
                        ? colors.primary
                        : colors.outline,
                  }}
                  onPress={() => updateSpeed(speed)}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color:
                        settings.speed === speed
                          ? colors.background
                          : colors.text,
                    }}
                  >
                    {getSpeedLabel(speed)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Hidden WebView for PDF processing and TTS */}
      {currentPdf && (
        <View
          style={{
            position: "absolute",
            left: -1000,
            top: -1000,
            width: 1,
            height: 1,
          }}
        >
          <WebView
            ref={webViewRef}
            source={{ uri: currentPdf.uri }}
            onMessage={handleWebViewMessageEnhanced}
            onLoadEnd={() => {
              // Extract text once PDF is loaded
              if (!extractingText && pdfContent.length === 0) {
                extractPdfText();
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
      )}
    </View>
  );
}
