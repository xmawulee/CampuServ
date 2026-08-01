import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomTabSpacing() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 64;
  const TAB_BAR_MARGIN = 16;
  const TAB_BAR_TOTAL_PADDING = TAB_BAR_HEIGHT + TAB_BAR_MARGIN * 2;
  
  return TAB_BAR_TOTAL_PADDING + insets.bottom;
}
