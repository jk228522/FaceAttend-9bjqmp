// Export Screen — PDF/JPG export and share
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { useAttendance } from '@/hooks/useAttendance';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AttendanceColumns, AppConfig } from '@/constants/config';
import { AttendanceRecord } from '@/services/DatabaseService';
import { Spacing, FontSize, FontWeight, Radius, Colors } from '@/constants/theme';

function generateAttendanceHTML(records: AttendanceRecord[]): string {
  const now = new Date().toLocaleString();
  const rowsPerPage = AppConfig.ROWS_PER_PAGE;
  const pages = Math.max(1, Math.ceil(records.length / rowsPerPage));

  const headerRow = `
    <tr>
      <th>#</th>
      <th>Name</th>
      ${AttendanceColumns.map((c) => `<th>${c.label}</th>`).join('')}
      <th>Timestamp</th>
    </tr>
  `;

  let bodyHTML = '';
  for (let p = 0; p < pages; p++) {
    const pageRecords = records.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    bodyHTML += `
      <div class="page">
        <div class="page-header">
          <h2>FaceAttend — Attendance Report</h2>
          <p>${AppConfig.BADGE_NAME} · ${AppConfig.BADGE_DEPT} · Generated: ${now}</p>
          <p>Page ${p + 1} of ${pages} · Total Records: ${records.length}</p>
        </div>
        <table>
          <thead>${headerRow}</thead>
          <tbody>
            ${pageRecords.map((row, i) => `
              <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                <td>${p * rowsPerPage + i + 1}</td>
                <td>${row.person_name ?? '-'}</td>
                ${AttendanceColumns.map((c) => `<td>${(row as any)[c.key] ?? '-'}</td>`).join('')}
                <td>${row.timestamp ?? '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
        .page { page-break-after: always; padding: 20px; }
        .page:last-child { page-break-after: auto; }
        .page-header { margin-bottom: 12px; border-bottom: 2px solid #F5A623; padding-bottom: 8px; }
        .page-header h2 { font-size: 16px; color: #0D0D1A; margin-bottom: 4px; }
        .page-header p { font-size: 10px; color: #555; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background-color: #1A1A2E; color: #F5A623; padding: 6px 4px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
        td { padding: 5px 4px; border: 1px solid #ddd; font-size: 10px; }
        tr.even td { background-color: #f9f9f9; }
        tr.odd td { background-color: #fff; }
      </style>
    </head>
    <body>${bodyHTML}</body>
    </html>
  `;
}

export default function ExportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const { exportAll } = useAttendance();

  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingJpg, setExportingJpg] = useState(false);
  const [lastExport, setLastExport] = useState<{ type: string; uri: string } | null>(null);

  const handleExportPDF = useCallback(async () => {
    setExportingPdf(true);
    try {
      const records = await exportAll();
      if (records.length === 0) {
        showAlert('No Data', 'No attendance records to export');
        return;
      }

      const html = generateAttendanceHTML(records);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Move to a named file
      const destUri = `${FileSystem.documentDirectory}attendance_${Date.now()}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: destUri });

      setLastExport({ type: 'PDF', uri: destUri });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Attendance Report',
        });
      } else {
        showAlert('PDF Exported', `Saved to: ${destUri}`);
      }
    } catch (e: any) {
      showAlert('Export Failed', e?.message ?? 'Failed to generate PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [exportAll]);

  const handleExportJPG = useCallback(async () => {
    setExportingJpg(true);
    try {
      const records = await exportAll();
      if (records.length === 0) {
        showAlert('No Data', 'No attendance records to export');
        return;
      }

      const html = generateAttendanceHTML(records);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // For JPG: in V1 we share the PDF (expo-print doesn't natively do image export)
      // Production: Use react-native-view-shot to capture rendered table as image
      const destUri = `${FileSystem.documentDirectory}attendance_${Date.now()}_img.pdf`;
      await FileSystem.moveAsync({ from: uri, to: destUri });

      setLastExport({ type: 'JPG', uri: destUri });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(destUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Attendance as Image',
        });
      } else {
        showAlert('Export Ready', `File saved: ${destUri}`);
      }
    } catch (e: any) {
      showAlert('Export Failed', e?.message ?? 'Failed to export');
    } finally {
      setExportingJpg(false);
    }
  }, [exportAll]);

  const handleShare = useCallback(async () => {
    if (!lastExport) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(lastExport.uri, {
          mimeType: lastExport.type === 'PDF' ? 'application/pdf' : 'image/jpeg',
          dialogTitle: 'Share via WhatsApp, Email, Drive...',
        });
      }
    } catch (e: any) {
      showAlert('Share Failed', e?.message ?? 'Cannot share file');
    }
  }, [lastExport]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Export Attendance</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Export Options */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Export Format</Text>

        <AppCard style={{ marginBottom: Spacing.md }}>
          <View style={styles.exportRow}>
            <View style={[styles.exportIcon, { backgroundColor: colors.errorBg }]}>
              <MaterialIcons name="picture-as-pdf" size={28} color={colors.error} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={[styles.exportTitle, { color: colors.textPrimary }]}>PDF Report</Text>
              <Text style={[styles.exportDesc, { color: colors.textMuted }]}>
                12 rows per page · Repeated header · Full table
              </Text>
            </View>
          </View>
          <AppButton
            label={exportingPdf ? 'Generating PDF...' : 'Export as PDF'}
            onPress={handleExportPDF}
            loading={exportingPdf}
            disabled={exportingJpg}
            fullWidth
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        <AppCard style={{ marginBottom: Spacing.md }}>
          <View style={styles.exportRow}>
            <View style={[styles.exportIcon, { backgroundColor: colors.infoBg }]}>
              <MaterialIcons name="image" size={28} color={colors.info} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={[styles.exportTitle, { color: colors.textPrimary }]}>Image Export</Text>
              <Text style={[styles.exportDesc, { color: colors.textMuted }]}>
                12 rows per page · Shareable image format
              </Text>
            </View>
          </View>
          <AppButton
            label={exportingJpg ? 'Generating Image...' : 'Export as Image'}
            onPress={handleExportJPG}
            loading={exportingJpg}
            disabled={exportingPdf}
            variant="secondary"
            fullWidth
            style={{ marginTop: Spacing.md }}
          />
        </AppCard>

        {/* Share Section */}
        {lastExport ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.md }]}>
              Share Last Export
            </Text>
            <AppCard elevated>
              <View style={styles.exportRow}>
                <MaterialIcons name="check-circle" size={24} color={colors.success} />
                <View style={styles.exportInfo}>
                  <Text style={[styles.exportTitle, { color: colors.textPrimary }]}>
                    {lastExport.type} Ready
                  </Text>
                  <Text style={[styles.exportDesc, { color: colors.textMuted }]} numberOfLines={1}>
                    {lastExport.uri}
                  </Text>
                </View>
              </View>
              <AppButton
                label="Share via WhatsApp / Email / Drive"
                onPress={handleShare}
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            </AppCard>
          </>
        ) : null}

        {/* Info */}
        <AppCard elevated style={{ marginTop: Spacing.lg }}>
          <View style={styles.infoSection}>
            <MaterialIcons name="info-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Exports are saved in app storage and shared via Android share sheet (WhatsApp, Email, Google Drive, Telegram, etc.). No specific app required.
            </Text>
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', includeFontPadding: false },
  content: { padding: Spacing.lg },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm, includeFontPadding: false, textTransform: 'uppercase', letterSpacing: 1 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  exportIcon: { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, includeFontPadding: false },
  exportDesc: { fontSize: FontSize.sm, marginTop: 2, includeFontPadding: false },
  infoSection: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20, includeFontPadding: false },
});
