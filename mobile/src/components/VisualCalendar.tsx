import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

interface CalendarEvent {
  date: string; // YYYY-MM-DD or ISO
  isHangus?: boolean;
  isCompleted?: boolean;
}

interface VisualCalendarProps {
  selectedDate: string; // YYYY-MM-DD or empty for all
  onSelectDate: (dateStr: string) => void;
  events?: CalendarEvent[];
}

const DAYS_HEADER = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function VisualCalendar({
  selectedDate,
  onSelectDate,
  events = []
}: VisualCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  // Initial view month based on selectedDate or today
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    return today.getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate) {
      const parsed = new Date(selectedDate);
      if (!isNaN(parsed.getTime())) return parsed.getMonth();
    }
    return today.getMonth();
  });

  // Map events by date string (YYYY-MM-DD)
  const eventMap = useMemo(() => {
    const map = new Map<string, { hasHangus: boolean; hasActive: boolean; hasCompleted: boolean }>();
    events.forEach((ev) => {
      if (!ev.date) return;
      const key = ev.date.substring(0, 10);
      const existing = map.get(key) || { hasHangus: false, hasActive: false, hasCompleted: false };
      if (ev.isHangus) existing.hasHangus = true;
      else if (ev.isCompleted) existing.hasCompleted = true;
      else existing.hasActive = true;
      map.set(key, existing);
    });
    return map;
  }, [events]);

  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDate(todayStr);
  }

  return (
    <View style={styles.container}>
      {/* Header Month Navigation */}
      <View style={styles.header}>
        <Pressable onPress={prevMonth} style={styles.navButton}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>

        <View style={styles.monthYearTitle}>
          <Text style={styles.monthText}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
        </View>

        <Pressable onPress={nextMonth} style={styles.navButton}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekRow}>
        {DAYS_HEADER.map((day, idx) => (
          <View key={day} style={styles.weekCell}>
            <Text style={[styles.weekText, idx === 0 && styles.sundayText]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {/* Empty cells before month start */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <View key={`empty-${idx}`} style={styles.dayCell} />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;
          const eventInfo = eventMap.get(dateStr);

          return (
            <Pressable
              key={dateStr}
              onPress={() => {
                if (isSelected) {
                  onSelectDate(""); // Toggle off
                } else {
                  onSelectDate(dateStr);
                }
              }}
              style={[
                styles.dayCell,
                isSelected && styles.selectedDayCell,
                isToday && !isSelected && styles.todayDayCell
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                  isToday && !isSelected && styles.todayDayText
                ]}
              >
                {dayNum}
              </Text>

              {/* Event indicators */}
              {eventInfo && (
                <View style={styles.dotContainer}>
                  {eventInfo.hasHangus && <View style={[styles.dot, styles.dotHangus]} />}
                  {eventInfo.hasActive && <View style={[styles.dot, styles.dotActive]} />}
                  {eventInfo.hasCompleted && !eventInfo.hasActive && (
                    <View style={[styles.dot, styles.dotCompleted]} />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Bottom Shortcuts */}
      <View style={styles.footer}>
        <Pressable onPress={goToToday} style={styles.shortcutBtn}>
          <Text style={styles.shortcutText}>Hari Ini</Text>
        </Pressable>
        {selectedDate ? (
          <Pressable onPress={() => onSelectDate("")} style={styles.shortcutBtn}>
            <Text style={[styles.shortcutText, styles.shortcutClear]}>Tampilkan Semua Tanggal</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  navText: {
    fontSize: 22,
    color: colors.navy,
    fontWeight: "600",
    lineHeight: 26
  },
  monthYearTitle: {
    alignItems: "center"
  },
  monthText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.navy
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    paddingBottom: 6
  },
  weekCell: {
    flex: 1,
    alignItems: "center"
  },
  weekText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted
  },
  sundayText: {
    color: colors.danger
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginVertical: 1,
    position: "relative"
  },
  selectedDayCell: {
    backgroundColor: colors.teal
  },
  todayDayCell: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    backgroundColor: colors.surface
  },
  dayText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink
  },
  selectedDayText: {
    color: colors.white,
    fontWeight: "900"
  },
  todayDayText: {
    color: colors.tealDark,
    fontWeight: "900"
  },
  dotContainer: {
    position: "absolute",
    bottom: 3,
    flexDirection: "row",
    gap: 2
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2
  },
  dotHangus: {
    backgroundColor: colors.danger
  },
  dotActive: {
    backgroundColor: colors.teal
  },
  dotCompleted: {
    backgroundColor: colors.success
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  shortcutBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.tealDark
  },
  shortcutClear: {
    color: colors.muted
  }
});
