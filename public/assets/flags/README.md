# Country flags

194 SVGs in this directory are the 4:3 country flags used by the coverage list, copied unchanged from [flag-icons v7.5.0](https://github.com/lipis/flag-icons/releases/tag/v7.5.0), `flags/4x3/`. The upstream MIT license is included in `LICENSE`.

Filenames use lowercase country codes from `src/data/missions.ts`. The non-ISO `SMOM` entry is the Sovereign Order of Malta. Its simple geometric state flag is drawn locally in `smom.svg` under this project's MIT license, following the [Order's official description and state-flag illustration](https://www.orderofmalta.int/government/flags-emblems/). It is distinct from Malta's national flag (`mt.svg`).

Flags describe the listed country, including when its recipient is an embassy in another country. They are decorative beside the written country name and are served locally with lazy loading. No icon runtime or external image service is required.

When adding a country, copy the matching SVG from a reviewed upstream release and retain the license. Use the same pinned release when reproducing this set.
