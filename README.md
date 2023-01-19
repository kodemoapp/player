<p align="center">
  <a href="https://kodemo.com">
  <img width="1500" alt="github-header" src="https://user-images.githubusercontent.com/629429/213417968-96cffd2a-e6e0-473f-b2f0-343007c0c2ee.png">
  </a>
</p>

# Kodemo

[Kodemo](https://kodemo.com) is a brand new format for writing more engaging technical documentation.
- 🔗 Learn more at [kodemo.com](https://komdeo.com)
- 👉 Try a [live demo](https://kodemo.com/docs/what-is-kodemo)
- 👀 Follow [@kodemoapp](https://twitter.com/kodemoapp)

## Kodemo Player

This repo contains the @kodemo/player package which is responsible for rendering and navigating Kodemo documents. The player is a React component and it needs to be provided with a valid [Kodemo document](https://kodemo.com/docs/format).

### Installation

To install @kodemo/player I recommend following the docs at <https://kodemo.com/docs/player>.

TLDR?

Install @kodemo/player using your package manager of choice:

```shell
npm i @kodemo/player # yarn add @kodemo/player
```

Once installed, you can import and use the player component like this:

```js
import React from 'react'
import ReactDOM from 'react-dom/client'
import { KodemoPlayer } from '@kodemo/player';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KodemoPlayer json={{
      story: '<h1>Example Document</h1>',
      subjects: {
        f992151a: {
          type: 'code',
          name: 'file.js',
          language: "javascript",
          versions: {
            e60944c4: { value: 'const a = 123;', },
          }
        }
      }
    }}></KodemoPlayer>
  </React.StrictMode>
)
```

### Development

If you want to make changes to the @kodemo/player source here's how:
1. Clone this repository
2. Run `yarn install`
3. Run `yarn dev` to start the development server
4. Open the URL from the dev server output and 💥

#### Other scripts
```shell
# run tests
yarn test

# build a new release
yarn build
```


--- 
<div align="center">
  MIT licensed | Copyright © 2022-2023 Hakim El Hattab, https://hakim.se
</div>
