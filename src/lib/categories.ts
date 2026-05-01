export const pluginCategoryMap: Record<string, { label: string; icon: string; keywords: string[] }> = {
  woocommerce: {
    label: 'WooCommerce',
    icon: 'lucide:shopping-cart',
    keywords: ['woocommerce', 'woocommerce-plugin', 'wooco', 'woocoommerce', 'e-commerce', 'order-management', 'stock-management', 'pre-order', 'order-history', 'hpos', 'sku', 'inventory-management', 'inventory-management-system', 'shopify-app'],
  },
  admin: {
    label: 'Admin Tools',
    icon: 'lucide:settings',
    keywords: ['admin', 'backend', 'admin-notice', 'remover-tool', 'bulk-operation', 'bulk-editing', 'staging', 'tag-management'],
  },
  security: {
    label: 'Security',
    icon: 'lucide:shield',
    keywords: ['gdpr', 'sensitive-data', 'blocking', 'ip-blocking', 'restrict-access'],
  },
  seo: {
    label: 'SEO',
    icon: 'lucide:search',
    keywords: ['seo', 'seo-optimization', 'rank-math', 'google-scholar', 'google-scholar-scrapper'],
  },
  users: {
    label: 'Users & Roles',
    icon: 'lucide:users',
    keywords: ['users', 'user-management', 'roles-management', 'customers', 'historical-preserve'],
  },
  content: {
    label: 'Content & Forms',
    icon: 'lucide:file-text',
    keywords: ['forms', 'gravity', 'gravity-forms', 'metadata', 'search', 'searching', 'html-to-markdown', 'markdown', 'llm', 'integration', 'integrations', 'file-sharing', 'filesystem', 'manager-system', 'logo-design'],
  },
};
