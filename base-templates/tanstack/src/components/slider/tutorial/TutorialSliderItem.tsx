import styles from './TutorialSliderItem.module.scss';
import { StyledText } from '~/components/texts/StyledText.tsx';
import { StyledButton } from '~/components/buttons/StyledButton.tsx';

interface ITutorialSliderItem {
  image: string;
  title: string;
  description?: string;
  button: string;
  loading?: boolean;
  onClick: () => void;
}

export function TutorialSliderItem({ image, title, description, button, loading, onClick }: ITutorialSliderItem) {
  return (
    <div className={styles.tutorialSliderItem}>
      <div className={styles.container}>
        <img className={styles.visual} src={image} alt={'visual'} />
        <StyledText type={'title'} marginTop={16} alternate>{title}</StyledText>
        {description && <StyledText type={'description'} marginTop={8} alternate>{description}</StyledText>}
        <StyledButton marginTop={16} loading={loading} onClick={onClick}>{button}</StyledButton>
      </div>
    </div>
  );
}
