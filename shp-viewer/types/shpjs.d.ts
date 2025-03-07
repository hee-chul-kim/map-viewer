declare module 'shpjs' {
  interface GeoJSON {
    type: string;
    features: Array<{
      type: string;
      geometry: {
        type: string;
        coordinates: any;
      };
      properties?: Record<string, any>;
    }>;
  }

  interface ShpJS {
    parseShp(shpBuffer: ArrayBuffer, shxBuffer?: ArrayBuffer): Promise<GeoJSON>;
    parseDbf(dbfBuffer: ArrayBuffer): Promise<any[]>;
    combine(arr: any[]): GeoJSON;
  }

  const shp: ShpJS;
  export default shp;
} 