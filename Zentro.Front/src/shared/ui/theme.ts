import { createTheme } from "@mui/material/styles";

// Ajustes compartidos: tipografía, formas, controles y superficies de toda la app.
export const uiTheme = createTheme({
  typography: {
    fontFamily: "var(--font-body)",
    fontSize: 16,
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  palette: { primary: { main: "#7856ac" }, secondary: { main: "#7ca58e" } },
  components: {
    MuiButtonBase: {
      defaultProps: { focusRipple: true },
      styleOverrides: {
        root: {
          font: "inherit",
          fontWeight: 600,
          gap: 8,
          padding: "10px 16px",
          border: "1px solid var(--line)",
          borderRadius: 12,
          backgroundColor: "var(--panel)",
          color: "var(--text)",
          "&.Mui-focusVisible": {
            outline: "3px solid var(--accent)",
            outlineOffset: 3,
          },
          "&.Mui-disabled": { opacity: 0.5 },
          "&:hover": {
            backgroundColor: "var(--soft)",
            borderColor: "var(--accent)",
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          background: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--line)",
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "inherit",
          fontWeight: 600,
          borderRadius: 10,
          height: "auto",
          minHeight: 30,
        },
        label: { whiteSpace: "normal", padding: "6px 10px" },
      },
    },
    MuiTooltip: {
      defaultProps: { enterDelay: 450, enterTouchDelay: 500 },
      styleOverrides: { tooltip: { fontSize: 13, borderRadius: 10 } },
    },
  },
});

export const motionSettings = {
  modal: { duration: 0.14 },
  page: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  disclosure: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
};

export const statusTones = {
  paid: "#a8cdb9",
  early: "#b9c9ed",
  reserved: "#e4cd93",
  overdue: "#deb2bf",
  today: "#e7bd94",
  upcoming: "#c7b4e4",
  unknown: "#c7b4e4",
};
