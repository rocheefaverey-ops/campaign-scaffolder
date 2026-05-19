import { getCapeCopy, getCapeProperty } from '~/server/cape/CapeProvider.ts';

export async function loadVoucherData(language: string) {
  const [headline, body, ctaDone] = await getCapeCopy(language, [
    ['voucher', 'headline'],
    ['voucher', 'body'],
    ['voucher', 'ctaDone'],
  ]);

  const showQrProp = await getCapeProperty({ type: 'settings', path: ['pages', 'voucher', 'showQr'] });
  const showQr = showQrProp.asBoolean() ?? true;

  return {
    copy: { headline, body, ctaDone },
    showQr,
  };
}
