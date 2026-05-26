import type { VariantProps } from 'class-variance-authority'
import { typographyVariants } from '@components/ui/typography/data/typography.variants.data'

export type TypographyColor = Pick<VariantProps<typeof typographyVariants>, 'color'>['color']
