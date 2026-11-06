export interface PluginCompatibility {
  wordpress: string;
  wordpressTested: string;
  php: string;
  woocommerce: string;
  woocommerceTested: string;
}

const field = (text: string, name: string): string => {
  const match = text.match(new RegExp(`^\\s*(?:[/*#]\\s*)?${name}\\s*:\\s*([^\\r\\n]+)`, 'im'));
  return match?.[1].trim() || '';
};

/** Read declared requirements, never infer support from a dependency or version number. */
export function parsePluginCompatibility(pluginHeader: string, readme: string): PluginCompatibility {
  const header = pluginHeader.slice(0, 8192);
  const readmeHeader = readme.split(/\n\s*==\s+/)[0];
  return {
    wordpress: field(header, 'Requires at least') || field(readmeHeader, 'Requires at least'),
    wordpressTested: field(readmeHeader, 'Tested up to') || field(header, 'Tested up to'),
    php: field(header, 'Requires PHP') || field(readmeHeader, 'Requires PHP'),
    woocommerce: field(header, 'WC requires at least') || field(readmeHeader, 'WC requires at least'),
    woocommerceTested: field(header, 'WC tested up to') || field(readmeHeader, 'WC tested up to'),
  };
}
