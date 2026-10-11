import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import ButtonBase from "@mui/material/ButtonBase";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { uiTheme } from "./theme.ts";
export { default as Surface } from "@mui/material/Paper";
export { default as Badge } from "@mui/material/Chip";
export { default as Tooltip } from "@mui/material/Tooltip";
export { default as Stack } from "@mui/material/Stack";
export { default as Box } from "@mui/material/Box";
export { default as Snackbar } from "@mui/material/Snackbar";
export { motionSettings, statusTones } from "./theme.ts";

// Mantiene la API de un botón HTML, incluidos formularios y referencias.
export const Button = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button">
>(function Button({ type = "submit", ...props }, ref) {
  return <ButtonBase ref={ref} type={type} {...props} />;
});

export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={uiTheme}>
        <LazyMotion features={domAnimation}>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
