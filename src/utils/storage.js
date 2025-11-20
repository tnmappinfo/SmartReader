import AsyncStorage from "@react-native-async-storage/async-storage";

const PDF_LIST_KEY = "pdfs";
const SETTINGS_KEY = "settings";

// Default settings
const defaultSettings = {
  defaultLanguage: "en",
  defaultSpeed: 1,
};

export const storageAPI = {
  // PDF Management
  async getPDFs() {
    try {
      const pdfs = await AsyncStorage.getItem(PDF_LIST_KEY);
      return pdfs ? JSON.parse(pdfs) : [];
    } catch (error) {
      console.error("Error getting PDFs:", error);
      return [];
    }
  },

  async savePDF(pdf) {
    try {
      const existingPDFs = await this.getPDFs();
      const newPDF = {
        id: Date.now().toString(),
        name: pdf.name,
        uri: pdf.uri,
        type: pdf.type || "upload", // 'upload' or 'scanned'
        createdAt: new Date().toISOString(),
        ...pdf,
      };

      const updatedPDFs = [...existingPDFs, newPDF];
      await AsyncStorage.setItem(PDF_LIST_KEY, JSON.stringify(updatedPDFs));
      return newPDF;
    } catch (error) {
      console.error("Error saving PDF:", error);
      throw error;
    }
  },

  async deletePDF(pdfId) {
    try {
      const existingPDFs = await this.getPDFs();
      const filteredPDFs = existingPDFs.filter((pdf) => pdf.id !== pdfId);
      await AsyncStorage.setItem(PDF_LIST_KEY, JSON.stringify(filteredPDFs));
      return true;
    } catch (error) {
      console.error("Error deleting PDF:", error);
      throw error;
    }
  },

  // Settings Management
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      return settings
        ? { ...defaultSettings, ...JSON.parse(settings) }
        : defaultSettings;
    } catch (error) {
      console.error("Error getting settings:", error);
      return defaultSettings;
    }
  },

  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      return updatedSettings;
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  },
};
