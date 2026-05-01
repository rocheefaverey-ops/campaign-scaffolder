import { cva } from "class-variance-authority";

// In this file you can pre define options for typography components
// These options have to correspond to the options in the design system you can find in the Figma file


export const typographyVariants = cva(
  "",
  {
    variants: {
      family: {
        default: 'font-default antialiased',
      },
      size: {
        default: "md:text-[16px] md:leading-[24px]",
        h1: "md:text-[36px] md:leading-[24px]",
        h2: "md:text-[28px] md:leading-[24px]",
        // h3: ...more,
      },
      mobileSize: {
        default: "text-[16px] leading-[26px]",
        h1: "text-[48px] leading-[48px]",
        h2: "text-[32px] leading-[40px]",
        // h3: ...more,
      },
      color: {
        default: "text-black",
        primary: "text-primary",
        secondary: "text-secondary",
        // tertiary: "text-tertiary",
        // white: "text-white",
        // black: "text-black",
        // statusRed: ...more,
      },
      weight: {
        default: "font-normal",
        bold: "font-bold",
        // light: "font-light",
        // medium: "font-medium",
        // semibold: ...more,
      }
    },
    defaultVariants: {
      family: "default",
      color: "default",
      size: "default",
      mobileSize: "default",
      weight: "default"
    },
  }
);