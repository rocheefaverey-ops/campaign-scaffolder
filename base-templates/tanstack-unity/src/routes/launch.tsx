import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import style from './launch.module.scss';
import { PageContainer } from '~/components/containers/PageContainer.tsx';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';
import { loadLaunchData } from '~/loaders/LaunchLoader.ts';
import { useGameNavigation } from '~/hooks/useGameNavigation.ts';
import { SmartImage } from '~/components/visuals/SmartImage.tsx';
import VisualImage from '~/assets/images/logo.png';

export const Route = createFileRoute('/launch')({
  component: Launch,
  loader: async ({ context }) => await loadLaunchData(context.language),
});

function Launch() {
  const { copy } = Route.useLoaderData();
  const { logoPlaceholder } = useLoaderData({ from: '__root__' });
  const { isPending, navigate } = useGameNavigation();

  return (
    <PageContainer className={style.launch}>
      <SmartImage src={VisualImage} alt={'visual'} width={200} aspectRatio={1} placeholder={logoPlaceholder} />
      <StyledText type={'title'} marginTop={16} alternate>{copy.title}</StyledText>
      <StyledText type={'description'} marginTop={8} alternate>{copy.description}</StyledText>
      <StyledButton marginTop={16} loading={isPending} onClick={navigate}>{copy.button}</StyledButton>
      <StyledButton marginTop={8} linkOptions={{ to: '/tutorial' }} alternate>Tutorial</StyledButton>
    </PageContainer>
  );
}
