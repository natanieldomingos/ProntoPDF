declare module "docx" {
  export class Paragraph {
    constructor(options?: { text?: string });
  }

  export class Document {
    constructor(options: {
      sections: Array<{
        properties?: {
          column?: {
            count?: number;
            space?: number;
          };
        };
        children: Paragraph[];
      }>;
    });
  }

  export const Packer: {
    toBlob(document: Document): Promise<Blob>;
  };
}
