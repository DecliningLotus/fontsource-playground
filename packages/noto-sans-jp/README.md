# Fontsource Noto Sans JP

# Do not use this Playgrounds edition, as it is an unstable testing branch of the original [Fontsource monorepo](https://github.com/DecliningLotus/fontsource).

The CSS and web font files to easily self-host the “Noto Sans JP” font. Please visit the main [Fontsource monorepo](https://github.com/DecliningLotus/fontsource) to view more details on this package.

## Installation

Fontsource assumes you are using a bundler, such as Webpack, to load in CSS. Tools like [CRA](https://create-react-app.dev/), [Gatsby](https://www.gatsbyjs.org/) and [Next.js](https://nextjs.org/) are prebuilt example solutions that are compatible.

```javascript
yarn add fontsource-noto-sans-jp // npm install fontsource-noto-sans-jp
```

Then within your app entry file or site component, import it in. For example in Gatsby, you could simply import it into your `layout.js` component or `gatsby-browser.js` for limited circumstances.

```javascript
import "fontsource-noto-sans-jp" //require("fontsource-noto-sans-jp")
```

Fontsource allows you to select font subsets, weights and even individual styles, allowing you to cut down on payload sizes to the last byte! The default selection above, however, sticks to the Latin subset including all weights and styles.

```javascript
import "fontsource-noto-sans-jp/latin-ext.css" // All weights and styles included.
import "fontsource-noto-sans-jp/cyrillic-ext-400.css" // All styles included.
import "fontsource-noto-sans-jp/greek-700-normal.css" // Select either normal or italic.
```

Alternatively, the same solutions could be imported via SCSS!

```scss
@import "~fontsource-noto-sans-jp/index";
@import "~fontsource-noto-sans-jp/vietnamese-300-italic";
```

_Do confirm on Google Fonts (or elsewhere) whether your font supports a certain subset, weight or style beforehand as these examples may not reflect actual compatibility._

## Other Notes

Feel free to star and contribute new ideas to this repository that aim to improve the performance of font loading, as well as expanding the existing library we already have. Any suggestions or ideas can be voiced via an [issue](https://github.com/DecliningLotus/fontsource/issues).

