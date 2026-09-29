module.exports = {
  "extends": [
    "next/core-web-vitals",
    "prettier",
    "plugin:mdx/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  "ignorePatterns": [
    // imported components from shadcn
    "/components/ui/**",
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
  }
}
