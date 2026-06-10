const storageKey = "smartfunkos-theme";

export const themeBootstrapScript = `
(function () {
  try {
    var theme = window.localStorage.getItem("${storageKey}") === "light" ? "light" : "dark";
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
})();
`;
