// Dashboard Screen — Paginated attendance table with editable columns
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAlert } from '@/template';
import { useAttendance } from '@/hooks/useAttendance';
import { useAuth } from '@/hooks/useAuth';
import { AttendanceRecord } from '@/services/DatabaseService';
import { AttendanceColumns } from '@/constants/config';
import { Spacing, FontSize, FontWeight, Radius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COL_WIDTH = 90;
const NAME_COL_WIDTH = 130;
const TS_COL_WIDTH = 120;

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const { isLoggedIn } = useAuth();
  const { data, loading, error, loadPage, saveEdit } = useAttendance();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoggedIn) {
      showAlert('Login Required', 'Please login to view the dashboard');
      router.replace('/');
      return;
    }
    loadPage(1);
  }, [isLoggedIn]);

  const startEdit = useCallback((record: AttendanceRecord) => {
    setEditingId(record.id);
    const buf: Record<string, string> = {};
    AttendanceColumns.forEach((col) => {
      buf[col.key] = (record as any)[col.key] ?? '';
    });
    setEditBuffer(buf);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditBuffer({});
  }, []);

  const commitEdit = useCallback(async () => {
    if (editingId === null) return;
    const fields: any = {};
    AttendanceColumns.forEach((col) => {
      fields[col.key] = editBuffer[col.key] || null;
    });
    await saveEdit(editingId, fields);
    setEditingId(null);
    setEditBuffer({});
    await loadPage(data.currentPage);
  }, [editingId, editBuffer, saveEdit, loadPage, data.currentPage]);

  const renderTableHeader = () => (
    <View style={[styles.headerRow, { backgroundColor: colors.bgElevated, borderBottomColor: colors.border }]}>
      <Text style={[styles.cellHeader, { color: colors.primary, width: 44 }]}>#</Text>
      <Text style={[styles.cellHeader, { color: colors.primary, width: NAME_COL_WIDTH }]}>Name</Text>
      {AttendanceColumns.map((col) => (
        <Text key={col.key} style={[styles.cellHeader, { color: colors.primary, width: COL_WIDTH }]}>
          {col.label}
        </Text>
      ))}
      <Text style={[styles.cellHeader, { color: colors.primary, width: TS_COL_WIDTH }]}>Timestamp</Text>
      <Text style={[styles.cellHeader, { color: colors.primary, width: 64 }]}>Edit</Text>
    </View>
  );

  const renderRow = useCallback(({ item, index }: { item: AttendanceRecord; index: number }) => {
    const rowNum = (data.currentPage - 1) * 12 + index + 1;
    const isEditing = editingId === item.id;
    const bg = index % 2 === 0 ? colors.bgCard : colors.bgSurface;

    return (
      <View style={[styles.dataRow, { backgroundColor: bg, borderBottomColor: colors.border }]}>
        <Text style={[styles.cell, { color: colors.textMuted, width: 44 }]}>{rowNum}</Text>
        <Text style={[styles.cell, { color: colors.textPrimary, width: NAME_COL_WIDTH }]} numberOfLines={1}>
          {item.person_name ?? '-'}
        </Text>
        {AttendanceColumns.map((col) => (
          <View key={col.key} style={{ width: COL_WIDTH }}>
            {isEditing ? (
              <TextInput
                style={[styles.editCell, { color: colors.textPrimary, backgroundColor: colors.bgInput, borderColor: colors.primary }]}
                value={editBuffer[col.key] ?? ''}
                onChangeText={(t) => setEditBuffer((b) => ({ ...b, [col.key]: t }))}
                placeholder="-"
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={[styles.cell, { color: colors.textSecondary }]} numberOfLines={1}>
                {(item as any)[col.key] ?? '-'}
              </Text>
            )}
          </View>
        ))}
        <Text style={[styles.cell, { color: colors.textMuted, width: TS_COL_WIDTH, fontSize: FontSize.xs }]} numberOfLines={2}>
          {item.timestamp ? item.timestamp.replace('T', '\n') : '-'}
        </Text>
        <View style={{ width: 64, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isEditing ? (
            <>
              <Pressable onPress={commitEdit} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} accessibilityLabel="Save edit">
                <MaterialIcons name="check" size={18} color={colors.success} />
              </Pressable>
              <Pressable onPress={cancelEdit} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} accessibilityLabel="Cancel edit">
                <MaterialIcons name="close" size={18} color={colors.error} />
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => startEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} accessibilityLabel="Edit row">
              <MaterialIcons name="edit" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [editingId, editBuffer, data.currentPage, colors, commitEdit, cancelEdit, startEdit]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Attendance Dashboard</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {data.total} records · Page {data.currentPage}/{data.totalPages}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/export')}
          style={[styles.exportBtn, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
          accessibilityLabel="Export"
        >
          <MaterialIcons name="file-download" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Table */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : error ? (
        <View style={styles.errorState}>
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <Pressable onPress={() => loadPage(1)}>
            <Text style={{ color: colors.primary, fontSize: FontSize.body }}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <View>
            {renderTableHeader()}
            <FlatList
              data={data.records}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderRow}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyTable}>
                  <MaterialIcons name="inbox" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No attendance records yet.{'\n'}Start the camera to record attendance.
                  </Text>
                </View>
              }
            />
          </View>
        </ScrollView>
      )}

      {/* Pagination */}
      {data.totalPages > 1 ? (
        <View style={[styles.pagination, { paddingBottom: insets.bottom + Spacing.sm, borderTopColor: colors.border, backgroundColor: colors.bgSurface }]}>
          <Pressable
            onPress={() => loadPage(data.currentPage - 1)}
            disabled={data.currentPage <= 1}
            style={[styles.pageBtn, { borderColor: colors.border, opacity: data.currentPage <= 1 ? 0.4 : 1 }]}
            accessibilityLabel="Previous page"
          >
            <MaterialIcons name="chevron-left" size={24} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.pageInfo}>
            {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(data.currentPage - 3, data.totalPages - 6)) + i;
              return (
                <Pressable
                  key={pageNum}
                  onPress={() => loadPage(pageNum)}
                  style={[
                    styles.pageNumBtn,
                    pageNum === data.currentPage && { backgroundColor: colors.primary },
                  ]}
                  accessibilityLabel={`Page ${pageNum}`}
                >
                  <Text style={[
                    styles.pageNumText,
                    { color: pageNum === data.currentPage ? colors.textOnPrimary : colors.textSecondary },
                  ]}>
                    {pageNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => loadPage(data.currentPage + 1)}
            disabled={data.currentPage >= data.totalPages}
            style={[styles.pageBtn, { borderColor: colors.border, opacity: data.currentPage >= data.totalPages ? 0.4 : 1 }]}
            accessibilityLabel="Next page"
          >
            <MaterialIcons name="chevron-right" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      ) : null}
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
    gap: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, includeFontPadding: false },
  headerSub: { fontSize: FontSize.xs, includeFontPadding: false, marginTop: 2 },
  exportBtn: { width: 44, height: 44, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 2,
  },
  cellHeader: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    minHeight: 44,
  },
  cell: {
    fontSize: FontSize.xs,
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
  editCell: {
    fontSize: FontSize.xs,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    includeFontPadding: false,
    minHeight: 28,
  },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.body, textAlign: 'center', includeFontPadding: false },
  emptyTable: { width: 600, paddingVertical: 60, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: FontSize.body, textAlign: 'center', lineHeight: 24, includeFontPadding: false },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  pageBtn: { width: 40, height: 40, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageInfo: { flexDirection: 'row', gap: 4 },
  pageNumBtn: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  pageNumText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, includeFontPadding: false },
});
