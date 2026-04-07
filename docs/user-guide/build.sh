#!/bin/bash
set -e

cd "$(dirname "$0")"

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
for texbin in /usr/local/texlive/*/bin/*/; do
  [ -d "$texbin" ] && export PATH="$texbin:$PATH"
done

VERSION=$(git -C "$(dirname "$0")" describe --tags --abbrev=0 2>/dev/null || echo "dev")
BUILD_DATE=$(date '+%B %Y')

build_pdf() {
  local src="$1"
  local out="$2"
  shift 2
  local vars=("$@")

  pandoc "$src" -o "${out%.pdf}.tex" --template=template.tex -V fontsize=12pt "${vars[@]}"
  # sed -i syntax differs between macOS and Linux
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/\\begin{longtable}\[\]/\\begin{longtable}[c]/g' "${out%.pdf}.tex"
  else
    sed -i 's/\\begin{longtable}\[\]/\\begin{longtable}[c]/g' "${out%.pdf}.tex"
  fi
  pdflatex "${out%.pdf}.tex"
  rm -f "${out%.pdf}.tex" "${out%.pdf}.aux" "${out%.pdf}.log" "${out%.pdf}.out"
  cp "$out" "../../frontend/core/public/$out"
  echo "Done: $out → frontend/core/public/$out"
}

build_pdf guide-en.md guide-en.pdf \
  -V "cover-subtitle=User Guide" \
  -V "header-title=User Guide" \
  -V "footer-tagline=End-to-End Encrypted File Transfer" \
  -V "cover-version=$VERSION" \
  -V "cover-date=$BUILD_DATE"

build_pdf guide-fr.md guide-fr.pdf \
  -V french=true \
  -V "cover-subtitle=Guide Utilisateur" \
  -V "header-title=Guide Utilisateur" \
  -V "footer-tagline=Transfert de fichiers chiffre de bout en bout" \
  -V "cover-version=$VERSION" \
  -V "cover-date=$BUILD_DATE"
