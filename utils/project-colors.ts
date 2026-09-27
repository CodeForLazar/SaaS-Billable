// Label colors a project can have (a dot next to its name). These are data stored on the project,
// not part of the app's theme, so they're fixed hex values. Shade 600 of Tailwind's palette:
// visible on both light and dark backgrounds.
export const PROJECT_COLORS = [
   { value: '#059669', label: 'Emerald' },
   { value: '#0284c7', label: 'Sky' },
   { value: '#4f46e5', label: 'Indigo' },
   { value: '#9333ea', label: 'Purple' },
   { value: '#db2777', label: 'Pink' },
   { value: '#dc2626', label: 'Red' },
   { value: '#d97706', label: 'Amber' },
   { value: '#57534e', label: 'Stone' }
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number]['value'];

export const PROJECT_COLOR_VALUES = PROJECT_COLORS.map((color) => color.value) as [
   ProjectColor,
   ...ProjectColor[]
];

export const DEFAULT_PROJECT_COLOR: ProjectColor = PROJECT_COLORS[0].value;
