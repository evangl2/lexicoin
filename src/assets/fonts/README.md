# Local Fonts Setup Guide (Variable Fonts)

✅ **Files Installed Successfully**
Your project is configured to use **Variable Fonts** for maximum flexibility and performance.

## 📁 Installed Fonts

You have successfully installed the following fonts in `src/assets/fonts/`:

| Font Family | Filename | Status |
| :--- | :--- | :--- |
| **Cinzel** | `Cinzel-Variable.ttf` | ✅ Installed |
| **Merriweather** | `Merriweather-Variable.ttf` | ✅ Installed |
| **Merriweather** (Italic) | `Merriweather-Italic-Variable.ttf` | ✅ Installed |
| **Fira Code** | `FiraCode-Variable.ttf` | ✅ Installed |
| **Noto Serif SC** | `NotoSerifSC-Variable.ttf` | ✅ Installed |
| **Noto Serif JP** | `NotoSerifJP-Variable.ttf` | ✅ Installed |
| **Noto Sans SC** | `NotoSansSC-Variable.ttf` | ✅ Installed |
| **Noto Sans JP** | `NotoSansJP-Variable.ttf` | ✅ Installed |

---

## ℹ️ Configuration Details

Your fonts are loaded via `src/assets/fonts/fonts.css` and applied globally.

*   **Variable Weights**: Supported from Thin (100) to Black (900).
*   **CJK Optimization**: Large CJK fonts are loaded locally, ensuring consistent rendering across devices without relying on system fonts.
*   **System Fallback**: If a file is missing in the future, the app safely falls back to system fonts (PingFang, YaHei, etc.).
