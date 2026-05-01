import type { NextPage } from 'next';
import Container from '@components/ui/container/container.component';
import { getDictionary } from './dictionaries';
import { Typography } from '@components/ui';

type Props = {
  params: Promise<{ locale: string }>;
};

const Home: NextPage<Props> = async ({ params: asyncParams }) => {
  const params = await asyncParams;
  const { locale } = params;

  const dict = await getDictionary(locale);
  return (
    <div>
      <Container>
        <div className="text-center my-4">
          <Typography type="h1" size="h1" mobileSize="h2" weight="bold" className="mb-2 text-primary">
            {dict.common.title}
          </Typography>
          <Typography type="h2" size="default">
            {dict.common.description}
          </Typography>
        </div>
      </Container>
    </div>
  );
};

export default Home;
