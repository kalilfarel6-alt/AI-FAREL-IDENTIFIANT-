export interface PipingComponent {
  type: string;
  dn: string | null;
  pn: string | null;
  material: string;
  connection: string;
  brands: string;
  standards: string[];
  description: string;
  maintenance_instructions: string;
  confidence: number;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  data: PipingComponent | null;
  loading: boolean;
  error: string | null;
}

export interface Manufacturer {
  id: string;
  name: string;
  logo: string;
  catalogs: Catalog[];
}

export interface Catalog {
  id: string;
  title: string;
  year: string;
  size: string;
  url: string;
}

export interface WebResource {
  title: string;
  uri: string;
  source: string;
}