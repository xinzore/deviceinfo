import { SECTION_CONFIG, SectionConfig, FieldConfig, FieldType } from './specConfig';
import { projectId, publicAnonKey } from './supabase/info';

export type FilterFieldConfig = {
  sectionId: string;
  fieldKey: string;
  label: string;
  type: FieldType;
  filterType?: 'text' | 'range' | 'boolean';
};

export type AdminSettings = {
  categories?: string[];
  formSectionIds?: string[];
  cardSectionIds?: string[];
  cardFields?: Record<string, string[]>;
  sectionCategories?: Record<string, string[]>;
  categorySectionTemplates?: Record<string, string[]>;
  hiddenFields?: Record<string, string[]>;
  extraFields?: Record<string, FieldConfig[]>;
  customSections?: (SectionConfig & {
    iconName?: string;
    iconHex?: string;
    categories?: string[];
  })[];
  filterFields?: FilterFieldConfig[];
};

export const defaultSettings: AdminSettings = {
  categories: ['Telefon'],
  formSectionIds: SECTION_CONFIG.map(section => section.id),
  cardSectionIds: SECTION_CONFIG.map(section => section.id),
  cardFields: {},
  sectionCategories: {},
  categorySectionTemplates: {},
  hiddenFields: {},
  extraFields: {},
  customSections: [],
  filterFields: [],
};

const ensureSectionCategories = (settings: AdminSettings) => {
  const categories = settings.categories || defaultSettings.categories || [];
  const defaultCategory = categories[0] || 'Telefon';
  const next = { ...(settings.sectionCategories || {}) };

  SECTION_CONFIG.forEach(section => {
    if (!next[section.id] || next[section.id].length === 0) {
      next[section.id] = [defaultCategory];
    }
  });

  (settings.customSections || []).forEach(section => {
    if (!next[section.id] || next[section.id].length === 0) {
      next[section.id] = section.categories && section.categories.length > 0
        ? section.categories
        : [defaultCategory];
    }
  });

  return next;
};

const ensureCategoryTemplates = (settings: AdminSettings) => {
  const categories = settings.categories || defaultSettings.categories || [];
  const defaultCategory = categories[0] || 'Telefon';
  const next = { ...(settings.categorySectionTemplates || {}) };

  if (!next[defaultCategory] || next[defaultCategory].length === 0) {
    next[defaultCategory] = SECTION_CONFIG.map(section => section.id);
  }

  return next;
};

export const mergeSettings = (incoming?: AdminSettings): AdminSettings => {
  const safe = incoming || {};
  const resolvedFilterFields = (safe.filterFields || defaultSettings.filterFields || []).map(field => ({
    ...field,
    filterType: field.filterType
      || (field.type === 'checkbox' ? 'boolean' : 'text'),
  }));
  const merged: AdminSettings = {
    ...defaultSettings,
    ...safe,
    categories: safe.categories && safe.categories.length > 0 ? safe.categories : defaultSettings.categories,
    formSectionIds: safe.formSectionIds && safe.formSectionIds.length > 0 ? safe.formSectionIds : defaultSettings.formSectionIds,
    cardSectionIds: safe.cardSectionIds && safe.cardSectionIds.length > 0 ? safe.cardSectionIds : defaultSettings.cardSectionIds,
    cardFields: safe.cardFields || defaultSettings.cardFields,
    sectionCategories: safe.sectionCategories || defaultSettings.sectionCategories,
    categorySectionTemplates: safe.categorySectionTemplates || defaultSettings.categorySectionTemplates,
    hiddenFields: safe.hiddenFields || defaultSettings.hiddenFields,
    extraFields: safe.extraFields || defaultSettings.extraFields,
    customSections: safe.customSections || defaultSettings.customSections,
    filterFields: resolvedFilterFields,
  };
  merged.sectionCategories = ensureSectionCategories(merged);
  merged.categorySectionTemplates = ensureCategoryTemplates(merged);
  return merged;
};

const mergeFields = (
  base: FieldConfig[],
  extras: FieldConfig[] = [],
  hidden: string[] = []
) => {
  const seen = new Set<string>();
  const merged = [...base, ...extras].filter(field => {
    if (hidden.includes(field.key)) return false;
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
  return merged;
};

export const buildSections = (settings?: AdminSettings): SectionConfig[] => {
  const hiddenFields = settings?.hiddenFields || {};
  const extraFields = settings?.extraFields || {};
  const customSections = settings?.customSections || [];

  const baseSections = SECTION_CONFIG.map(section => ({
    ...section,
    fields: mergeFields(
      section.fields,
      extraFields[section.id] || [],
      hiddenFields[section.id] || []
    ),
  }));

  const custom = customSections.map(section => ({
    ...section,
    fields: mergeFields(section.fields, [], hiddenFields[section.id] || []),
  }));

  return [...baseSections, ...custom];
};

const filterByCategory = (sections: SectionConfig[], settings?: AdminSettings, category?: string) => {
  if (!category) return sections;
  const map = settings?.sectionCategories || {};
  return sections.filter(section => (map[section.id] || []).includes(category));
};

export const getFormSections = (settings?: AdminSettings, category?: string) => {
  const sections = buildSections(settings);
  const ids = settings?.formSectionIds;
  const filtered = ids && ids.length > 0 ? sections.filter(section => ids.includes(section.id)) : sections;
  return filterByCategory(filtered, settings, category);
};

export const getCardSections = (settings?: AdminSettings, category?: string) => {
  const sections = buildSections(settings);
  const ids = settings?.cardSectionIds;
  const filtered = ids && ids.length > 0 ? sections.filter(section => ids.includes(section.id)) : sections;
  return filterByCategory(filtered, settings, category);
};

export const fetchSettings = async (): Promise<AdminSettings> => {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-ac750b50/settings`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Settings fetch error:', error);
  }
  return {};
};
