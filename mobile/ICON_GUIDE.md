# CampusServ Icon Usage Reference

This project has migrated fully away from `lucide-react-native` and uses `@expo/vector-icons` natively to achieve high-fidelity rendering and reduce bundle size.

## Icon Renderer Layer
All icon rendering is centralized in [CustomIcons.tsx](file:///c:/Users/allen/Desktop/CampuServ/mobile/src/components/CustomIcons.tsx).

To use icons, import the wrappers from this file:
```typescript
import { CustomIonicons as Ionicons, CustomMCI as MCI } from '../../components/CustomIcons';
```

* Use **`Ionicons`** as the primary icon set for standard navigation, UI forms, settings, and general utility icons to ensure native iOS/Android look-and-feel consistency.
* Use **`MCI`** (Material Community Icons) for specialized categories (e.g., service icons like `washing-machine`, `broom`, `truck-fast`).

---

## Conventions & Rules

### 1. Active vs. Inactive States
For tab bar navigations and toggleable buttons, follow this pattern:
* **Inactive/Default State**: Use the `-outline` variant of the icon (e.g. `home-outline`, `wallet-outline`).
* **Active/Selected State**: Use the filled/solid variant of the icon (e.g. `home`, `wallet`).

### 2. Standardized Sizing
Avoid using random pixel sizes for icons. Stick to the following size classes:
* **Small (SM)**: `16` (used inside cards, inline text labels, or metadata tags).
* **Medium (MD)**: `24` (default size for buttons, list items, and form inputs).
* **Large (LG)**: `32` (used for header actions or large icons).
* **Extra Large (XL)**: `48` to `64` (used for empty states or confirmation screens).

### 3. Colors
Always pull icon colors from the styling theme to ensure dark/light mode compatibility:
```typescript
const { colors } = useTheme();

// Example
<Ionicons name="person-outline" size={24} color={colors.textMuted} />
```

---

## Adding New Icons
If you need to add a new icon, simply look up the icon name on the [Expo Icon Explorer](https://icons.expo.fyi/) and pass it to the appropriate custom component (`Ionicons` or `MCI`).

> [!WARNING]
> Do NOT install or import `lucide-react-native` or any other external icon library. Always use the built-in `@expo/vector-icons` wrappers to maintain consistency.
