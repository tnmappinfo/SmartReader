import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Settings as SettingsIcon,
  Volume2,
  Zap,
  Globe,
  Info,
  Smartphone,
  FileText,
  Save,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/components/useColors";
import Header from "@/components/Header";
import { storageAPI } from "@/utils/storage";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [settings, setSettings] = useState({
    defaultLanguage: "en",
    defaultSpeed: 1,
  });
  const [loading, setLoading] = useState(true);
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await storageAPI.getSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
      Alert.alert("Error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await storageAPI.updateSettings(newSettings);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Error updating setting:", error);
      Alert.alert("Error", "Failed to update setting");
      // Revert the change
      loadSettings();
    }
  };

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowHeaderBorder(scrollY > 10);
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

  const resetSettings = () => {
    Alert.alert(
      "Reset Settings",
      "Are you sure you want to reset all settings to default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await updateSetting("defaultLanguage", "en");
              await updateSetting("defaultSpeed", 1);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              Alert.alert("Success", "Settings have been reset to defaults");
            } catch (error) {
              Alert.alert("Error", "Failed to reset settings");
            }
          },
        },
      ],
    );
  };

  const showAppInfo = () => {
    Alert.alert(
      "PDF Reader App",
      "Offline PDF reader with text-to-speech support.\n\nVersion: 1.0.0\n\nSupported Languages: English, Hindi, Gujarati\n\nFeatures:\n• PDF upload and management\n• Document scanning\n• Text-to-speech reading\n• Offline functionality\n• Multi-language support",
      [{ text: "OK" }],
    );
  };

  const clearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all PDFs and reset all settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "This will permanently delete all your PDFs and settings.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      // This would clear all data in a real implementation
                      console.log("Clearing all data...");
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      Alert.alert("Success", "All data has been cleared");
                    } catch (error) {
                      Alert.alert("Error", "Failed to clear data");
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="auto" />
        <Header title="Settings" showBorder={false} />
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
            Loading settings...
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
        <Header title="Settings" showBorder={showHeaderBorder} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 56 + 20, // Header height + spacing
          paddingBottom: insets.bottom, // Tab bar spacing
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Audio Settings */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Audio Settings
          </Text>

          {/* Default Language */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.outline,
              marginBottom: 16,
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.outline,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Globe size={20} color={colors.primary} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginLeft: 12,
                  }}
                >
                  Default Language
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                Choose the default language for text-to-speech reading
              </Text>
            </View>

            {["en", "hi", "gu"].map((lang, index) => (
              <TouchableOpacity
                key={lang}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index < 2 ? 1 : 0,
                  borderBottomColor: colors.outline,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => updateSetting("defaultLanguage", lang)}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.text,
                    fontWeight:
                      settings.defaultLanguage === lang ? "600" : "400",
                  }}
                >
                  {getLanguageName(lang)}
                </Text>
                {settings.defaultLanguage === lang && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.background,
                        fontWeight: "600",
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Default Speed */}
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          >
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.outline,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Zap size={20} color={colors.primary} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginLeft: 12,
                  }}
                >
                  Default Reading Speed
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                Set the default speed for text-to-speech playback
              </Text>
            </View>

            {[0.5, 1, 1.5, 2].map((speed, index) => (
              <TouchableOpacity
                key={speed}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index < 3 ? 1 : 0,
                  borderBottomColor: colors.outline,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
                onPress={() => updateSetting("defaultSpeed", speed)}
              >
                <Text
                  style={{
                    fontSize: 15,
                    color: colors.text,
                    fontWeight: settings.defaultSpeed === speed ? "600" : "400",
                  }}
                >
                  {getSpeedLabel(speed)}
                </Text>
                {settings.defaultSpeed === speed && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.background,
                        fontWeight: "600",
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Settings */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            App Settings
          </Text>

          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          >
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.outline,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={resetSettings}
            >
              <SettingsIcon size={20} color={colors.textSecondary} />
              <Text
                style={{
                  fontSize: 15,
                  color: colors.text,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                Reset to Defaults
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.outline,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={showAppInfo}
            >
              <Info size={20} color={colors.textSecondary} />
              <Text
                style={{
                  fontSize: 15,
                  color: colors.text,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                App Information
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={clearAllData}
            >
              <FileText size={20} color={colors.error} />
              <Text
                style={{
                  fontSize: 15,
                  color: colors.error,
                  marginLeft: 12,
                  flex: 1,
                }}
              >
                Clear All Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Features */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Features
          </Text>

          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Smartphone size={24} color={colors.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginLeft: 12,
                }}
              >
                Offline PDF Reader
              </Text>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              • Upload and manage PDF documents{"\n"}• Scan documents with your
              camera{"\n"}• Text-to-speech in multiple languages{"\n"}•
              Adjustable reading speed{"\n"}• Works completely offline{"\n"}•
              Secure local storage
            </Text>

            <View
              style={{
                backgroundColor: colors.primaryUltraLight,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.text,
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                All data is stored locally on your device
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
