import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
    StyleSheet,
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
// import {requireNativeViewManager} from "expo-modules-core";
import {useTheme} from "@react-navigation/native";
import { requireNativeModule } from "expo-modules-core";

const PdfReader = requireNativeModule("PdfReader");




// const PdfReaderView = requireNativeViewManager("PdfReader");


export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { pdfId } = useLocalSearchParams();


  const [currentPdf, setCurrentPdf] = useState(null);

  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const styles = getStyles(theme)

  useEffect(() => {
    loadPdf();
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
        PdfReader.openDocument(pdf.uri);
      setCurrentPdf(pdf);
    } catch (error) {
      console.error("Error loading PDF:", error);
      Alert.alert("Error", "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };



  if (currentPdf) {

      return (
          <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
              {/*<PdfReaderView*/}
              {/*    style={{flex: 1}}*/}
              {/*    filePath={currentPdf.uri}*/}
              {/*/>*/}
              <Text>Tetsdsfs</Text>
          </View>
      );


  } else {
      return (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
              <StatusBar style="auto" />

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


}



const getStyles = (theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
    });
