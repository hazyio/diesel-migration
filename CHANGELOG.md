# Change Log

All notable changes to the "Diesel Migration" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.0.3] - Released

- Fixed print schema command, it should now print to a file.

## [0.0.2] - Released

- Fix activation event

## [0.0.1] - Released

### Added

- Initial release.
- Set and configure the path to your project's `diesel.toml`.
- Explorer context menu actions on `diesel.toml`: set as diesel toml path, print schema, reset database, generate migration.
- Explorer context menu actions on the `migrations` folder: run, revert, redo, generate, and revert all migrations.
- Command Palette equivalents for setup migration, reset database, generate/run/revert/redo migration, revert all migrations, print schema, and reload extension.
- Configuration setting `diesel-migration.dieselToml` for specifying a custom `diesel.toml` location relative to the workspace root.
