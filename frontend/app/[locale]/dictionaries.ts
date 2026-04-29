import { Dictionary } from 'dictionaries/dictionary';
import 'server-only';

const dictionaries: { [key: string]: () => Promise<Dictionary> } = {
  en: () => import('../../dictionaries/en.json').then((module) => module.default),
  nl: () => import('../../dictionaries/nl.json').then((module) => module.default)
};

export const getDictionary = async (locale: string) => (dictionaries[locale] ? dictionaries[locale]() : dictionaries.nl());
