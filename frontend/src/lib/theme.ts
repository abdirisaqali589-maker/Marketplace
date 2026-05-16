export type ThemePreset = {
  id: string;
  label: string;
  description: string;
  homeTemplate: string;
  variables: Record<string, string>;
};

export const themePresets: ThemePreset[] = [
  {
    id: 'marketplace-classic',
    label: 'Marketplace Classic',
    description: 'Warm, dense commerce layout for mixed product catalogs.',
    homeTemplate: 'dense-marketplace',
    variables: {
      '--color-primary-50': '255 247 237',
      '--color-primary-100': '255 237 213',
      '--color-primary-200': '254 215 170',
      '--color-primary-300': '253 186 116',
      '--color-primary-400': '251 146 60',
      '--color-primary-500': '249 115 22',
      '--color-primary-600': '234 88 12',
      '--color-primary-700': '194 65 12',
      '--color-primary-800': '154 52 18',
      '--color-primary-900': '124 45 18',
      '--color-accent-600': '22 163 74',
    },
  },
  {
    id: 'trade-pro',
    label: 'Trade Pro',
    description: 'Cool blue buying desk for B2B and supplier-heavy storefronts.',
    homeTemplate: 'supplier-desk',
    variables: {
      '--color-primary-50': '239 246 255',
      '--color-primary-100': '219 234 254',
      '--color-primary-200': '191 219 254',
      '--color-primary-300': '147 197 253',
      '--color-primary-400': '96 165 250',
      '--color-primary-500': '59 130 246',
      '--color-primary-600': '37 99 235',
      '--color-primary-700': '29 78 216',
      '--color-primary-800': '30 64 175',
      '--color-primary-900': '30 58 138',
      '--color-accent-600': '8 145 178',
    },
  },
  {
    id: 'fresh-retail',
    label: 'Fresh Retail',
    description: 'Green accent system for grocery, wellness, and everyday retail.',
    homeTemplate: 'retail-grid',
    variables: {
      '--color-primary-50': '240 253 244',
      '--color-primary-100': '220 252 231',
      '--color-primary-200': '187 247 208',
      '--color-primary-300': '134 239 172',
      '--color-primary-400': '74 222 128',
      '--color-primary-500': '34 197 94',
      '--color-primary-600': '22 163 74',
      '--color-primary-700': '21 128 61',
      '--color-primary-800': '22 101 52',
      '--color-primary-900': '20 83 45',
      '--color-accent-600': '234 88 12',
    },
  },
  {
    id: 'mono-luxe',
    label: 'Mono Luxe',
    description: 'Restrained black and gray palette for premium catalogs.',
    homeTemplate: 'editorial-grid',
    variables: {
      '--color-primary-50': '249 250 251',
      '--color-primary-100': '243 244 246',
      '--color-primary-200': '229 231 235',
      '--color-primary-300': '209 213 219',
      '--color-primary-400': '156 163 175',
      '--color-primary-500': '107 114 128',
      '--color-primary-600': '75 85 99',
      '--color-primary-700': '55 65 81',
      '--color-primary-800': '31 41 55',
      '--color-primary-900': '17 24 39',
      '--color-accent-600': '217 119 6',
    },
  },
];

export function resolveTheme(themeConfig: any) {
  const preset = themePresets.find((item) => item.id === themeConfig?.presetId) || themePresets[0];
  return {
    ...preset,
    ...themeConfig,
    variables: { ...preset.variables, ...(themeConfig?.variables || {}) },
  };
}
