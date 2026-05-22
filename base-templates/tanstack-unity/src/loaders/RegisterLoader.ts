import { getCapeCopy, getCapeTranslatedProperty } from '~/server/cape/CapeProvider.ts';

export async function loadRegisterData(language: string) {
  const [[
    headline, subline, cta, title, description, button, genericError,
    nameTitle, namePH, nameError, emailTitle, emailPH, emailError, countryTitle, countryError, optText1, optError1, optText2,
    registerHeadline, registerSubline, registerCta, labelFirstName, labelEmail, registerOptIn1, registerOptIn2,
  ], optLink1] = await Promise.all([
    getCapeCopy(language, [
      ['registration', 'headline'],
      ['registration', 'subline'],
      ['registration', 'cta'],
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
      ['register', 'headline'],
      ['register', 'subline'],
      ['register', 'cta'],
      ['register', 'labelFirstName'],
      ['register', 'labelEmail'],
      ['register', 'optIn1'],
      ['register', 'optIn2'],
    ]),
    getCapeTranslatedProperty(language, { type: 'files', path: ['pdfs', 'terms'] }),
  ]);

  return {
    copy: {
      title: registerHeadline || headline || title || 'Register',
      description: registerSubline || subline || description || 'Enter your details to enter.',
      button: registerCta || cta || button || 'Submit',
      genericError: genericError || 'Something went wrong. Please try again.',
      name: {
        label: labelFirstName || nameTitle || 'Name',
        placeholder: namePH || 'Enter your name',
        error: nameError || 'Please enter your name',
      },
      email: {
        label: labelEmail || emailTitle || 'Email',
        placeholder: emailPH || 'Enter your email',
        error: emailError || 'Please enter a valid email',
      },
      country: {
        label: countryTitle,
        error: countryError,
      },
      optInOne: {
        label: registerOptIn1 || optText1 || 'I agree to the terms and conditions.',
        error: optError1 || 'This field is required.',
        link: optLink1.asFile()?.url,
      },
      optInTwo: {
        label: registerOptIn2 || optText2,
      },
    },
  };
}
