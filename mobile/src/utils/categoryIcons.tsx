import React from 'react';
import { CustomMCI } from '../components/CustomIcons';

export const CATEGORY_STYLES: Record<string, { icon: any; bg: string; iconColor: string }> = {
  'Laundry': { icon: 'washing-machine', bg: '#FFF0E6', iconColor: '#FF6B35' },
  'Cleaning': { icon: 'broom', bg: '#E8F8F0', iconColor: '#27AE60' },
  'Room Cleaning': { icon: 'broom', bg: '#E8F8F0', iconColor: '#27AE60' },
  'Tutoring': { icon: 'human-male-board', bg: '#EEF0FF', iconColor: '#5C6BC0' },
  'Errands': { icon: 'shopping-outline', bg: '#FFF9E6', iconColor: '#F39C12' },
  'Design': { icon: 'palette-outline', bg: '#FEE6F4', iconColor: '#E91E8C' },
  'Design & Print': { icon: 'palette-outline', bg: '#FEE6F4', iconColor: '#E91E8C' },
  'Printing': { icon: 'text-box-outline', bg: '#EEF2F6', iconColor: '#475569' },
  'Repairs': { icon: 'hammer-wrench', bg: '#E6F4FF', iconColor: '#1E88E5' },
  'Tech Repairs': { icon: 'monitor-cellphone', bg: '#E3F2FD', iconColor: '#1E88E5' },
  'Tech Repair': { icon: 'monitor-cellphone', bg: '#E3F2FD', iconColor: '#1E88E5' },
  'Delivery': { icon: 'truck-delivery', bg: '#FEE6E6', iconColor: '#E53935' },
  'Beauty': { icon: 'face-woman-shimmer', bg: '#FCE4EC', iconColor: '#D81B60' },
  'Hair & Beauty': { icon: 'face-woman-shimmer', bg: '#FCE4EC', iconColor: '#D81B60' },
  'Styling & Grooming': { icon: 'face-woman-shimmer', bg: '#FCE4EC', iconColor: '#D81B60' },
  'Tech Support': { icon: 'monitor-cellphone', bg: '#E3F2FD', iconColor: '#1E88E5' },
  'Moving': { icon: 'truck-fast', bg: '#E8F5E9', iconColor: '#43A047' },
  'Photography': { icon: 'camera-iris', bg: '#F3E5F5', iconColor: '#8E24AA' },
  'Plumbing': { icon: 'pipe-wrench', bg: '#E0F7FA', iconColor: '#00ACC1' },
  'Event Setup': { icon: 'calendar', bg: '#FFF9E6', iconColor: '#F39C12' },
};

export const getCategoryStyles = (categoryName: string | undefined | null) => {
  if (!categoryName) {
    return { icon: 'text-box-outline', bg: '#F1F5F9', iconColor: '#64748B' };
  }
  return CATEGORY_STYLES[categoryName] || { icon: 'briefcase-outline', bg: '#F1F5F9', iconColor: '#64748B' };
};

export function CategoryIcon({ name, size, color }: { name: string | undefined | null; size: number; color: string }) {
  const styles = getCategoryStyles(name);
  return <CustomMCI name={styles.icon as any} size={size} color={color} />;
}
