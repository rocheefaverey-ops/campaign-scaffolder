export const filterLocale = (locale: string) => {
  let filteredLocale = locale;
  if (filteredLocale !== 'nl' && filteredLocale !== 'en') {
    filteredLocale = 'nl';
  }

  return filteredLocale;
};
