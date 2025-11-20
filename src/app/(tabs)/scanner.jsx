import React, {useState, useRef} from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    Image
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {StatusBar} from "expo-status-bar";
import {CameraView, useCameraPermissions} from "expo-camera";
import {Camera, Check, X, RotateCcw, Save, Plus} from "lucide-react-native";
// import {Image} from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as Haptics from "expo-haptics";
import {useColors} from "@/components/useColors";
import Header from "@/components/Header";
import {storageAPI} from "@/utils/storage";

export default function ScannerScreen() {
    const insets = useSafeAreaInsets();
    const colors = useColors();
    const cameraRef = useRef(null);

    const [permission, requestPermission] = useCameraPermissions();
    const [scannedImages, setScannedImages] = useState([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [pdfName, setPdfName] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleCameraPermission = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            return result.granted;
        }
        return true;
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            });

            if (photo?.uri) {
                setScannedImages((prev) => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        uri: photo?.uri,
                        isProcessed: false,
                    },
                ]);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error("Error taking picture:", error);
            Alert.alert("Error", "Failed to capture image");
        }
    };

    const retakeImage = (imageId) => {
        setScannedImages((prev) => prev.filter((img) => img.id !== imageId));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const processImage = async (imageId) => {
        try {
            const image = scannedImages.find((img) => img.id === imageId);
            if (!image) return;

            // Apply image processing (enhance for document scanning)
            const processedImage = await ImageManipulator.manipulateImage(
                image.uri,
                [
                    {
                        resize: {
                            width: 1200, // Standardize width for PDF
                        },
                    },
                ],
                {
                    compress: 0.9,
                    format: ImageManipulator.SaveFormat.JPEG,
                },
            );

            setScannedImages((prev) =>
                prev.map((img) =>
                    img.id === imageId
                        ? {...img, uri: processedImage.uri, isProcessed: true}
                        : img,
                ),
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Error processing image:", error);
            Alert.alert("Error", "Failed to process image");
        }
    };

    const handleSavePDF = async () => {
        if (scannedImages.length === 0) {
            Alert.alert("Error", "No images to save");
            return;
        }

        if (!pdfName.trim()) {
            Alert.alert("Error", "Please enter a name for your PDF");
            return;
        }

        try {
            setIsProcessing(true);

            // For this implementation, we'll save the images as individual files
            // In a real implementation, you'd convert these to a PDF
            const pdfData = {
                name: pdfName.trim(),
                type: "scanned",
                images: scannedImages.map((img) => img.uri),
                pageCount: scannedImages.length,
            };

            // Create a mock PDF URI (in real implementation, this would be the actual PDF file)
            const mockPdfUri = `pdf-${Date.now()}.pdf`;

            await storageAPI.savePDF({
                ...pdfData,
                uri: mockPdfUri,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "PDF saved successfully", [
                {
                    text: "OK",
                    onPress: () => {
                        setScannedImages([]);
                        setPdfName("");
                        setShowSaveModal(false);
                    },
                },
            ]);
        } catch (error) {
            console.error("Error saving PDF:", error);
            Alert.alert("Error", "Failed to save PDF");
        } finally {
            setIsProcessing(false);
        }
    };

    const clearScannedImages = () => {
        Alert.alert(
            "Clear All Images",
            "Are you sure you want to clear all scanned images?",
            [
                {text: "Cancel", style: "cancel"},
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                        setScannedImages([]);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    },
                },
            ],
        );
    };

    if (!permission) {
        return (
            <View style={{flex: 1, backgroundColor: colors.background}}>
                <StatusBar style="auto"/>
                <Header title="Scanner"/>
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 40,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 16,
                            color: colors.textSecondary,
                            textAlign: "center",
                        }}
                    >
                        Requesting camera permissions...
                    </Text>
                </View>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={{flex: 1, backgroundColor: colors.background}}>
                <StatusBar style="auto"/>
                <Header title="Scanner"/>
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
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
                        <Camera size={48} color={colors.primary}/>
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
                        Camera Permission Required
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
                        We need access to your camera to scan documents and create PDFs.
                    </Text>

                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 12,
                        }}
                        onPress={requestPermission}
                    >
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: colors.background,
                            }}
                        >
                            Grant Permission
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const saveButton =
        scannedImages.length > 0 ? (
            <TouchableOpacity
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                }}
                onPress={() => setShowSaveModal(true)}
                accessibilityLabel="Save PDF"
            >
                <Save size={20} color={colors.background}/>
            </TouchableOpacity>
        ) : null;

    return (
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <StatusBar style="auto"/>

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
                    title="Scanner"
                    showBorder={false}
                    rightComponent={saveButton}
                />
            </View>

            {/* Camera View */}
            <CameraView
                ref={cameraRef}
                style={{
                    flex: 1,
                    marginTop: insets.top + 56,
                }}
                facing="back"
            >
                {/* Scanned Images Preview */}
                {scannedImages.length > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: 20,
                      left: 20,
                      right: 20,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: colors.cardBackground + "CC",
                        borderRadius: 12,
                        padding: 12,
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          Scanned Pages: {scannedImages.length}
                        </Text>
                        <TouchableOpacity
                          style={{
                            padding: 4,
                            borderRadius: 8,
                            backgroundColor: colors.error + "20",
                          }}
                          onPress={clearScannedImages}
                        >
                          <X size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {scannedImages.map((image) => (
                            <View key={image.id} style={{ position: "relative" }}>
                              <Image
                                source={{ uri: image.uri }}
                                style={{
                                  width: 60,
                                  height: 80,
                                  borderRadius: 8,
                                }}
                                contentFit="cover"
                              />
                              <View
                                style={{
                                  position: "absolute",
                                  top: 4,
                                  right: 4,
                                  flexDirection: "row",
                                  gap: 4,
                                }}
                              >
                                {!image.isProcessed && (
                                  <TouchableOpacity
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 10,
                                      backgroundColor: colors.primary,
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onPress={() => processImage(image.id)}
                                  >
                                    <Check size={12} color={colors.background} />
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: colors.error,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                  onPress={() => retakeImage(image.id)}
                                >
                                  <RotateCcw size={10} color={colors.background} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* Camera Controls */}
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        // position: "absolute",
                        // top: 0,
                        // bottom: 0,
                        // left: 0,
                        // right: 0,
                        alignItems: "center",
                    }}
                >
                    <TouchableOpacity
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: colors.background,
                            borderWidth: 6,
                            borderColor: colors.primary,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        onPress={takePicture}
                    >
                        <Camera size={32} color={colors.primary}/>
                    </TouchableOpacity>

                    <Text
                        style={{
                            fontSize: 14,
                            color: colors.background,
                            marginTop: 12,
                            textAlign: "center",
                            fontWeight: "500",
                        }}
                    >
                        Tap to capture page
                    </Text>
                </View>
            </CameraView>

            {/* Save PDF Modal */}
            <Modal
                visible={showSaveModal}
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
                        <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.primary,
                                    fontWeight: "500",
                                }}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>

                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: "600",
                                color: colors.text,
                            }}
                        >
                            Save PDF
                        </Text>

                        <TouchableOpacity
                            onPress={handleSavePDF}
                            disabled={isProcessing || !pdfName.trim()}
                            style={{
                                opacity: isProcessing || !pdfName.trim() ? 0.5 : 1,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    color: colors.primary,
                                    fontWeight: "600",
                                }}
                            >
                                {isProcessing ? "Saving..." : "Save"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{padding: 20}}>
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: "600",
                                color: colors.text,
                                marginBottom: 8,
                            }}
                        >
                            PDF Name
                        </Text>

                        <TextInput
                            style={{
                                backgroundColor: colors.fieldFill,
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 16,
                                color: colors.text,
                                marginBottom: 20,
                            }}
                            placeholder="Enter PDF name"
                            placeholderTextColor={colors.textPlaceholder}
                            value={pdfName}
                            onChangeText={setPdfName}
                            autoFocus
                        />

                        <View
                            style={{
                                backgroundColor: colors.cardBackground,
                                borderRadius: 12,
                                padding: 16,
                                borderWidth: 1,
                                borderColor: colors.outline,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: colors.text,
                                    marginBottom: 8,
                                }}
                            >
                                Document Summary
                            </Text>
                            <Text
                                style={{
                                    fontSize: 14,
                                    color: colors.textSecondary,
                                    lineHeight: 20,
                                }}
                            >
                                Pages: {scannedImages.length}
                                {"\n"}
                                Format: PDF{"\n"}
                                Quality: High
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
