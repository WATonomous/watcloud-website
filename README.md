# WATcloud website

The [website](https://cloud.watonomous.ca) for WATcloud.

## Contributing

> [!IMPORTANT]  
> The website is deployed via an [internal monorepo](https://github.com/WATonomous/infra-config)
> (you may get a 404 if you are not a WATcloud team member), and the code is mirrored to a
> [public repo](https://github.com/WATonomous/watcloud-website). Pull requests from the public
> repo should be applied to the internal repo by a WATcloud team member (see
> [Applying changes](#applying-changes-to-the-internal-monorepo)).

### Getting started

1. Clone the repo
2. Install dependencies:
    ```bash
    pip install -r requirements.txt
    npm install
    ```
3. Run the development server:
    ```bash
    # This line is optional if you are using the internal monorepo
    export FETCH_FIXTURES_FROM=http://cloud.watonomous.ca/fixtures
    npm run dev
    ```

### Images

Images should be uploaded to [WATcloud Assets](https://cloud.watonomous.ca/docs/utilities/assets), and the `watcloud://` URI should be placed in `./scripts/generate-assets.js` to be resolved during the build process.

During the build process, multiple versions (e.g. WebP, AVIF, etc.) of the image are generated and a TypeScript file is created in `./build/fixtures/images.ts`. This file can be imported and used in the website:

```tsx
import Picture from '@/components/picture'
import { ComputerDark } from '@/build/fixtures/images'

<Picture alt="Abstract Computer (Dark)" image={ComputerDark} />
```

The Picture component will tell the browser to automatically choose the best image format for the user's device.

### Applying changes (to the internal monorepo)

WATcloud admins can apply changes from the public repo to the internal repo by running:

```sh
PR_NUMBER=28
curl https://patch-diff.githubusercontent.com/raw/WATonomous/watcloud-website/pull/$PR_NUMBER.patch | git am --directory=website
```

## Development

### Spell Checking

This project uses [CodeSpell](https://github.com/codespell-project/codespell) to catch common spelling mistakes in documentation and code comments.

To install the pre-commit hook:

```bash
pip install pre-commit
pre-commit install
```
