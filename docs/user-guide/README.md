# User Guide — Documentation

Source for the end-user PDF guide. Written in Markdown, compiled to PDF via Pandoc + pdflatex. Two languages are supported: English and French.

## Dependencies

**macOS**

```bash
brew install pandoc
brew install --cask basictex
```

After installing BasicTeX, open a new terminal, then:

```bash
sudo /usr/local/texlive/$(ls /usr/local/texlive/)/bin/$(ls /usr/local/texlive/$(ls /usr/local/texlive/)/bin/)/tlmgr update --self
sudo /usr/local/texlive/$(ls /usr/local/texlive/)/bin/$(ls /usr/local/texlive/$(ls /usr/local/texlive/)/bin/)/tlmgr install collection-fontsrecommended titlesec
```

**Linux (Debian/Ubuntu)**

```bash
apt install pandoc texlive-latex-recommended texlive-fonts-recommended texlive-latex-extra
```

## Compile

**From the terminal:**

```bash
cd docs/user-guide
./build.sh
```

**From IntelliJ:** use the **Build Docs** run configuration (`.run/Build Docs.run.xml`).

Generates `guide-en.pdf` and `guide-fr.pdf`, and copies them to `frontend/core/public/`.

The version is read automatically from the latest git tag (`git describe --tags`). Falls back to `dev` if no tag exists.

## Files

- `guide-en.md` — English source (edit this for English content)
- `guide-fr.md` — French source (edit this for French content)
- `template.tex` — LaTeX template (layout, colors, logo, header/footer)
- `build.sh` — build script, generates both PDFs
- `guide-en.pdf` / `guide-fr.pdf` — compiled output (not committed to git)

## Contributing

Edit both `guide-en.md` and `guide-fr.md` when updating content — keep them in sync.

Compile locally with `./build.sh` to verify output before submitting a PR.

PDFs are not committed to git — they are generated at release time by CI.
