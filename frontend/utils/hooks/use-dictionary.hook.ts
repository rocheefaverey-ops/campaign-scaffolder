/* eslint-disable @typescript-eslint/no-require-imports */

import { filterLocale } from '@utils/helpers/filter-locale';
import { Dictionary } from 'dictionaries/dictionary';
import { useParams } from 'next/navigation';

export const useDictionary = () => {
  const { locale } = useParams();
  const filteredLocale = filterLocale(locale as string);
  const dictionary = require(`../../dictionaries/${filteredLocale}.json`);
  return dictionary as Dictionary;
};
