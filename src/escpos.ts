import { TemplateParser } from './template-parser';
import { XMLParser } from './xml-parser';
import { BufferBuilder } from './buffer-builder';

export class EscPos {
  public static getBufferFromTemplate(
    template: string,
    data: any,
    options: any,
  ): number[] {
    let templateParser = new TemplateParser();
    return templateParser.parser(template, data, options).build();
  }

  public static getBufferFromXML(xml: string, options: any): number[] {
    let xmlParser = new XMLParser();
    return xmlParser.parser(xml, options).build();
  }

  public static getBufferBuilder(options: any): BufferBuilder {
    return new BufferBuilder(true, options);
  }
}
