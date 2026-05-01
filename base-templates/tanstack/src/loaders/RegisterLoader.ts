import { getCapeCopy, getCapeTranslatedProperty } from '~/server/cape/CapeProvider.ts';

export async function loadRegisterData(language: string) {
  const [[title, description, button, genericError, nameTitle, namePH, nameError, emailTitle, emailPH, emailError, countryTitle, countryError, optText1, optError1, optText2], optLink1] = await Promise.all([
    getCapeCopy(language, [
      ['registration', 'title'],
      ['registration', 'description'],
      ['registration', 'buttonSignUp'],
      ['registration', 'genericError'],
      ['registration', 'nameTitle'],
      ['registration', 'namePlaceholder'],
      ['registration', 'nameError'],
      ['registration', 'emailTitle'],
      ['registration', 'emailPlaceholder'],
      ['registration', 'emailError'],
      ['registration', 'countryTitle'],
      ['registration', 'countryError'],
      ['registration', 'optinTextOne'],
      ['registration', 'optinErrorOne'],
      ['registration', 'optinTextTwo'],
    ]),
    getCapeTranslatedProperty(language, { type: 'files', path: ['pdfs', 'terms'] }),
  ]);

  return {
    copy: {
      title,
      description,
      button,
      genericError,
      name: {
        label: nameTitle,
        placeholder: namePH,
        error: nameError,
      },
      email: {
        label: emailTitle,
        placeholder: emailPH,
        error: emailError,
      },
      country: {
        label: countryTitle,
        error: countryError,
      },
      optInOne: {
        label: optText1,
        error: optError1,
        link: optLink1.asFile()?.url,
      },
      optInTwo: {
        label: optText2,
      },
    },
  };
}
