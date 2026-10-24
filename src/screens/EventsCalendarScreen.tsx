import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, HyperlocalEvent } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - spacing.lg * 2) / 7;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MonthCalendarData {
  monthName: string;
  year: number;
  monthIndex: number; // 0-based: 11 = Dec, 0 = Jan
  totalDays: number;
  firstDayOfWeek: number; // 0 = Sun, 1 = Mon ...
}

const ALL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getMonthConfig = (year: number, monthIndex: number): MonthCalendarData => {
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  return {
    monthName: ALL_MONTHS[monthIndex],
    year,
    monthIndex,
    totalDays,
    firstDayOfWeek,
  };
};

const DAYS_HEADER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EventsCalendarScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { allEvents, isSaved, toggleSave } = useEvents();
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'map' | 'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>('2026-12-21'); // Pre-select Dec 21 to match reference

  // Calendar month selection state
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(11); // December 2026
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);

  const displayedMonths = useMemo(() => {
    // Preserve initial two-month view if Dec 2026 is active
    if (selectedYear === 2026 && selectedMonthIndex === 11) {
      return [getMonthConfig(2026, 11), getMonthConfig(2027, 0)];
    }
    return [getMonthConfig(selectedYear, selectedMonthIndex)];
  }, [selectedYear, selectedMonthIndex]);

  const handlePrevMonth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonthIndex((m) => m + 1);
    }
  };

  // Map of events keyed by ISO date: YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, HyperlocalEvent[]> = {};
    allEvents.forEach((ev) => {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    });
    return map;
  }, [allEvents]);

  // Selected date's events
  const selectedEvents = useMemo(() => {
    return eventsByDate[selectedDate] || [];
  }, [eventsByDate, selectedDate]);

  const handleDateSelect = (isoDate: string) => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptic fallback
    }
    setSelectedDate(isoDate);
  };

  const handleEventPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const renderMonthGrid = (config: MonthCalendarData) => {
    const days: (number | null)[] = [];

    // Prepend nulls for offset
    for (let i = 0; i < config.firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= config.totalDays; day++) {
      days.push(day);
    }

    return (
      <View key={`${config.monthName}-${config.year}`} style={styles.monthSection}>
        {/* Month Header */}
        <Text style={styles.monthTitle}>
          {config.monthName} {config.year}
        </Text>

        {/* Days of Week Header */}
        <View style={styles.daysHeaderRow}>
          {DAYS_HEADER.map((d) => (
            <Text key={d} style={styles.dayHeaderText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Day Cells Grid */}
        <View style={styles.daysGrid}>
          {days.map((dayNum, idx) => {
            if (dayNum === null) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }

            const monthStr = String(config.monthIndex + 1).padStart(2, '0');
            const dayStr = String(dayNum).padStart(2, '0');
            const cellIso = `${config.year}-${monthStr}-${dayStr}`;

            const matchingEvents = eventsByDate[cellIso] || [];
            const hasEvent = matchingEvents.length > 0;
            const isSelected = selectedDate === cellIso;

            return (
              <TouchableOpacity
                key={`day-${cellIso}`}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                ]}
                onPress={() => handleDateSelect(cellIso)}
                activeOpacity={0.7}
              >
                {hasEvent ? (
                  // Event Indicator: circular image preview matching reference image 2!
                  <View style={styles.eventAvatarContainer}>
                    <Image
                      source={{ uri: matchingEvents[0].imageUrl }}
                      style={styles.eventThumbnailCircle}
                    />
                    {isSelected && <View style={styles.selectedGlowRing} />}
                  </View>
                ) : (
                  // Normal day number
                  <Text
                    style={[
                      styles.dayNumberText,
                      isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {dayNum}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Ambient Gradient Background Glow */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(255, 107, 0, 0.2)',
            'rgba(7, 8, 11, 0.65)',
            '#07080B',
          ]}
          locations={[0, 0.35, 0.85]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.radialAuraCircle} />
      </View>

      <View
        style={[
          styles.safeHeaderWrapper,
          { paddingTop: Math.max(insets.top, 38) + 8 },
        ]}
      >
        {/* Top Navigation Bar: < Events Calendar ... */}
        <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.iconNavBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>Events Calendar</Text>

        <View style={styles.topRightProfileContainer}>
          <View style={styles.headerBrandBadge}>
            <Text style={styles.headerBrandText}>Social Buddy</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              navigation.navigate('Profile');
            }}
            activeOpacity={0.8}
          >
            <Image
              source={{
                uri:
                  user?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              }}
              style={styles.avatarImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-navigation Icons Bar (Map, Calendar, Grid) */}
      <View style={styles.subNavBar}>
        <TouchableOpacity
          style={styles.subNavItem}
          onPress={() => setActiveSubTab('map')}
        >
          <Ionicons
            name="map-outline"
            size={20}
            color={activeSubTab === 'map' ? colors.orangePrimary : colors.textMuted}
          />
          {activeSubTab === 'map' && <View style={styles.subTabActiveLine} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.subNavItem}
          onPress={() => setActiveSubTab('calendar')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeSubTab === 'calendar' ? colors.orangePrimary : colors.textMuted}
          />
          {activeSubTab === 'calendar' && <View style={styles.subTabActiveLine} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.subNavItem}
          onPress={() => setActiveSubTab('list')}
        >
          <Ionicons
            name="grid-outline"
            size={20}
            color={activeSubTab === 'list' ? colors.orangePrimary : colors.textMuted}
          />
          {activeSubTab === 'list' && <View style={styles.subTabActiveLine} />}
        </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Dropdown Bar */}
        <View style={styles.monthDropdownBar}>
          <TouchableOpacity
            style={styles.monthNavArrow}
            onPress={handlePrevMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthDropdownBtn}
            onPress={() => setIsMonthPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.orangePrimary} style={{ marginRight: 6 }} />
            <Text style={styles.monthDropdownBtnText}>
              {ALL_MONTHS[selectedMonthIndex]} {selectedYear}
            </Text>
            <Ionicons name="chevron-down" size={13} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthNavArrow}
            onPress={handleNextMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Render Month Calendars */}
        {displayedMonths.map((config) => renderMonthGrid(config))}

        {/* Selected Date Event Cards Drawer */}
        <View style={styles.selectedDateDrawer}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerDateTitle}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }) : 'Selected Date'}
              </Text>
              <Text style={styles.drawerSubtitle}>
                {selectedEvents.length} event{selectedEvents.length === 1 ? '' : 's'} scheduled
              </Text>
            </View>

            {selectedEvents.length > 0 && (
              <View style={styles.activeDotBadge}>
                <Ionicons name="flame" size={12} color={colors.orangePrimary} />
                <Text style={styles.activeDotText}>Active</Text>
              </View>
            )}
          </View>

          {selectedEvents.length === 0 ? (
            <View style={styles.emptyDrawer}>
              <Ionicons name="calendar-clear-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyDrawerTitle}>No events on this date</Text>
              <Text style={styles.emptyDrawerSub}>
                Tap on any circular photo icon above to preview featured dates (e.g. Dec 2, Dec 12, Dec 19, Dec 21, Jan 10, Jan 25).
              </Text>
            </View>
          ) : (
            selectedEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRowCard}
                onPress={() => handleEventPress(event.id)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: event.imageUrl }} style={styles.eventRowImage} />
                <View style={styles.eventRowInfo}>
                  <Text style={styles.eventRowCategory}>
                    {event.category.toUpperCase()} • {event.time}
                  </Text>
                  <Text style={styles.eventRowTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventRowVenue} numberOfLines={1}>
                    {event.venue}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.eventRowBookmark}
                  onPress={() => toggleSave(event.id)}
                >
                  <Ionicons
                    name={isSaved(event.id) ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={isSaved(event.id) ? colors.orangePrimary : colors.textMuted}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Month Dropdown Selector Modal */}
      <Modal
        visible={isMonthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMonthPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMonthPickerOpen(false)}
        >
          <View style={styles.monthPickerModalContent}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Select Month & Year</Text>
              <TouchableOpacity
                onPress={() => setIsMonthPickerOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Year Selector Pills */}
            <View style={styles.yearToggleRow}>
              {[2026, 2027, 2028].map((yr) => {
                const isSelected = selectedYear === yr;
                return (
                  <TouchableOpacity
                    key={`yr-${yr}`}
                    style={[
                      styles.yearToggleBtn,
                      isSelected && styles.yearToggleBtnActive,
                    ]}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setSelectedYear(yr);
                    }}
                  >
                    <Text
                      style={[
                        styles.yearToggleText,
                        isSelected && styles.yearToggleTextActive,
                      ]}
                    >
                      {yr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 12-Month Grid */}
            <View style={styles.monthsGrid}>
              {ALL_MONTHS.map((mName, mIdx) => {
                const isSelected = selectedMonthIndex === mIdx;
                return (
                  <TouchableOpacity
                    key={`month-${mName}`}
                    style={[
                      styles.monthGridItem,
                      isSelected && styles.monthGridItemActive,
                    ]}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setSelectedMonthIndex(mIdx);
                      setIsMonthPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.monthGridText,
                        isSelected && styles.monthGridTextActive,
                      ]}
                    >
                      {mName.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  ambientGlowContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  radialAuraCircle: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: width * 0.95,
    height: 340,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    opacity: 0.6,
  },
  safeHeaderWrapper: {
    zIndex: 10,
    paddingBottom: 2,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  iconNavBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightProfileContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerBrandBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    marginBottom: 2,
  },
  headerBrandText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.orangePrimary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  navTitle: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subNavBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingTop: spacing.xs,
  },
  subNavItem: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  subTabActiveLine: {
    position: 'absolute',
    bottom: -1,
    width: 32,
    height: 2.5,
    backgroundColor: colors.orangePrimary,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  monthSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayHeaderText: {
    width: CELL_SIZE,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    position: 'relative',
  },
  dayCellSelected: {
    borderRadius: CELL_SIZE / 2,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  dayNumberTextSelected: {
    color: colors.orangePrimary,
    fontWeight: '800',
  },
  eventAvatarContainer: {
    width: 34,
    height: 34,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventThumbnailCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.65)',
  },
  selectedGlowRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.orangePrimary,
  },
  selectedDateDrawer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCardSubtle,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  drawerDateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  drawerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  activeDotText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontWeight: '700',
    fontSize: 10,
  },
  emptyDrawer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyDrawerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptyDrawerSub: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  eventRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  eventRowImage: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  eventRowInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  eventRowCategory: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventRowTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  eventRowVenue: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  eventRowBookmark: {
    padding: spacing.xs,
  },
  monthDropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  monthDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  monthDropdownBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  monthNavArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  monthPickerModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthPickerTitle: {
    ...typography.h3,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  yearToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceElevated,
    padding: 4,
    borderRadius: borderRadius.pill,
  },
  yearToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: borderRadius.pill,
  },
  yearToggleBtnActive: {
    backgroundColor: colors.orangePrimary,
  },
  yearToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  yearToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthGridItem: {
    width: '31%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 4,
  },
  monthGridItemActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: colors.orangePrimary,
  },
  monthGridText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  monthGridTextActive: {
    color: colors.orangePrimary,
    fontWeight: '800',
  },
});
