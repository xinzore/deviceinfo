type PhoneSlugInput = {
  brand?: string;
  title?: string;
};

const turkishCharMap: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

const replaceTurkishChars = (value: string) =>
  value.replace(/[çğıİöşü]/gi, (char) => turkishCharMap[char] || char);

export const slugify = (value: string) =>
  replaceTurkishChars(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildPhoneSlug = ({ brand, title }: PhoneSlugInput) =>
  slugify(`${brand ?? ''} ${title ?? ''}`.trim());
