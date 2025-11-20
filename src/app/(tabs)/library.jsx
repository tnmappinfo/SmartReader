import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { FileText, Plus, Trash2, Calendar, Eye } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useColors } from "@/components/useColors";
import Header from "@/components/Header";
import { storageAPI } from "@/utils/storage";

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHeaderBorder, setShowHeaderBorder] = useState(false);

  const loadPDFs = useCallback(async () => {
    try {
      const savedPDFs = await storageAPI.getPDFs();
      setPdfs(savedPDFs);
    } catch (error) {
      console.error("Error loading PDFs:", error);
      Alert.alert("Error", "Failed to load PDFs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPDFs();
  }, [loadPDFs]);

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    setShowHeaderBorder(scrollY > 10);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPDFs();
    setRefreshing(false);
  }, [loadPDFs]);

  const handleUploadPDF = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        console.log("PDF file path uri: ", file.uri)
        console.log("PDF file path name: ", file.name)

        const pdf = {
          name: file.name,
          uri: file.uri,
          size: file.size,
          type: "upload",
        };

        await storageAPI.savePDF(pdf);
        await loadPDFs();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "PDF uploaded successfully");
      }
    } catch (error) {
      console.error("Error uploading PDF:", error);
      Alert.alert("Error", "Failed to upload PDF");
    }
  };

  const handleDeletePDF = (pdf) => {
    Alert.alert(
      "Delete PDF",
      `Are you sure you want to delete "${pdf.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await storageAPI.deletePDF(pdf.id);
              await loadPDFs();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (error) {
              Alert.alert("Error", "Failed to delete PDF");
            }
          },
        },
      ],
    );
  };

  const handleOpenPDF = (pdf) => {
      console.log("Handle open pdf:", pdf)
    router.push({
      pathname: "/(tabs)/player",
      params: { pdfId: pdf.id },
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const uploadButton = (
    <TouchableOpacity
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
      onPress={handleUploadPDF}
      accessibilityLabel="Upload PDF"
    >
      <Plus size={20} color={colors.background} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="auto" />
        <Header
          title="Library"
          showBorder={false}
          rightComponent={uploadButton}
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
            Loading PDFs...
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
          title="Library"
          showBorder={showHeaderBorder}
          rightComponent={uploadButton}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 56 + 20, // Header height + spacing
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {pdfs.length === 0 ? (
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
              No PDFs Yet
            </Text>

            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 32,
              }}
            >
              Upload PDFs or scan documents to get started with your offline PDF
              reader.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={handleUploadPDF}
            >
              <Plus size={20} color={colors.background} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.background,
                  marginLeft: 8,
                }}
              >
                Upload PDF
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 16, marginTop: 8 }}>
            {pdfs.map((pdf) => (
              <TouchableOpacity
                key={pdf.id}
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.outline,
                }}
                onPress={() => handleOpenPDF(pdf)}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <FileText size={20} color={colors.primary} />
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: colors.text,
                          marginLeft: 8,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {pdf.name}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Calendar size={14} color={colors.textSecondary} />
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.textSecondary,
                          marginLeft: 6,
                        }}
                      >
                        {formatDate(pdf.createdAt)}
                      </Text>
                    </View>

                    {pdf.size && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                        }}
                      >
                        {formatFileSize(pdf.size)}
                      </Text>
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.primary + "15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => handleOpenPDF(pdf)}
                    >
                      <Eye size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.error + "15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => handleDeletePDF(pdf)}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
