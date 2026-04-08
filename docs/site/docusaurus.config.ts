import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'sE2EEnd',
  tagline: 'End-to-End Encrypted File Transfer — Open Source',
  favicon: 'img/logo.png',

  url: 'https://se2eend.github.io',
  baseUrl: '/sE2EEnd/',

  organizationName: 'sE2EEnd',
  projectName: 'sE2EEnd',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr'],
    localeConfigs: {
      en: { label: 'English' },
      fr: { label: 'Français' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/sE2EEnd/sE2EEnd/tree/main/docs/site/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.png',
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'sE2EEnd',
      logo: {
        alt: 'sE2EEnd Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/sE2EEnd/sE2EEnd',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/getting-started' },
            { label: 'Deployment', to: '/deployment' },
            { label: 'Configuration', to: '/configuration' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub Issues', href: 'https://github.com/sE2EEnd/sE2EEnd/issues' },
            { label: 'GitHub Discussions', href: 'https://github.com/sE2EEnd/sE2EEnd/discussions' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/sE2EEnd/sE2EEnd' },
            { label: 'License (AGPL-3.0)', href: 'https://github.com/sE2EEnd/sE2EEnd/blob/main/LICENSE' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} sE2EEnd contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'java', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
