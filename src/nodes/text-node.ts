import { XMLNode } from '../xml-node';
import { BufferBuilder } from '../buffer-builder';

export default class TextNode extends XMLNode {
  constructor(node: any) {
    super(node);
  }

  public open(bufferBuilder: BufferBuilder): BufferBuilder {
    let encoding: string = this.attributes.encoding || 'utf-8';
    let processText: string = this.attributes.processText || 'true';
    let codepage: number = parseInt(this.attributes.codepage) || 0;
    if (/\d+:\d+/.test(this.attributes.size)) {
      let size: number[] = new String(this.attributes.size)
        .split(':')
        .map(entry => parseInt(entry));
      bufferBuilder.setCharacterSize(size[0], size[1]);
    }

    let text = this.getContent().replace(/&nbsp;/g, ' ');
    bufferBuilder.printText(text, encoding, codepage, processText);
    return bufferBuilder;
  }

  public close(bufferBuilder: BufferBuilder): BufferBuilder {
    bufferBuilder.resetCharacterSize();
    return bufferBuilder;
  }
}
