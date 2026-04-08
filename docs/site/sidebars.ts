import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
        slug: '/getting-started',
        description: 'Get sE2EEnd up and running in minutes.',
      },
      items: [
        'getting-started/prerequisites',
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/first-steps',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      link: {
        type: 'generated-index',
        slug: '/deployment',
        description: 'Deploy sE2EEnd in production with Docker Compose, configure a reverse proxy, and set up Keycloak.',
      },
      items: [
        'deployment/docker-compose',
        'deployment/environment-variables',
        'deployment/keycloak',
        'deployment/reverse-proxy',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      link: {
        type: 'generated-index',
        slug: '/configuration',
        description: 'Customise storage backends, branding, and instance settings.',
      },
      items: [
        'configuration/theming',
        'configuration/storage',
      ],
    },
    {
      type: 'doc',
      id: 'architecture',
      label: 'Architecture',
    },
    {
      type: 'doc',
      id: 'contributing',
      label: 'Contributing',
    },
  ],
};

export default sidebars;
