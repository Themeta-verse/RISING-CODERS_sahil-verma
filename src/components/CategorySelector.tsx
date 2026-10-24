import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { EventCategory } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

interface CategoryItem {
  key: EventCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'All', label: 'All', icon: 'grid' },
  { key: 'Music', label: 'Music', icon: 'musical-notes' },
  { key: 'Comedy', label: 'Comedy', icon: 'happy' },
  { key: 'Workshops', label: 'Workshops', icon: 'build' },
  { key: 'College', label: 'College', icon: 'school' },
  { key: 'Sports', label: 'Sports', icon: 'basketball' },
  { key: 'Meetups', label: 'Meetups', icon: 'people' },
  { key: 'Parties', label: 'Parties', icon: 'flame' },
];

interface CategorySelectorProps {
  selectedCategory: EventCategory;
  onSelectCategory: (category: EventCategory) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const handlePress = (category: EventCategory) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptic fallback
    }
    onSelectCategory(category);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {CATEGORIES.map((item) => {
          const isSelected = item.key === selectedCategory;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => handlePress(item.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={isSelected ? colors.textOnAmber : colors.amberPrimary}
                style={styles.icon}
              />
              <Text style={[styles.label, isSelected && styles.labelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.xs,
  },
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pillActive: {
    backgroundColor: colors.amberPrimary,
    borderColor: colors.amberLight,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.textOnAmber,
    fontWeight: '700',
  },
});
