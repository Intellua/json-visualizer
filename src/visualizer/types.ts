// src/types.ts
export interface JsonNode {
    path: string;
    value: any;
    level: number;
    isExpandable?: boolean;
  }
  
  export interface RowRendererProps {
    index: number;
    style: React.CSSProperties;
  }