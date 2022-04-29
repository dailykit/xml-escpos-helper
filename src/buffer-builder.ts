import { Command } from './command';
import { MutableBuffer } from 'mutable-buffer';
import Image from './image';
import iconv from 'iconv-lite';
import { Util } from './util';
import { wrapWord } from './wrapWord';
export class BufferBuilder {
  private buffer: MutableBuffer;

  constructor(
    private defaultSettings: boolean = true,
    private options: any = {
      wrapWord: true,
      wrapWordMaxLength: 32,
    },
  ) {
    this.buffer = new MutableBuffer();
    if (this.defaultSettings) {
      this.resetCharacterSize();
      this.resetCharacterCodeTable();
    }
  }

  public end(): BufferBuilder {
    return this;
  }

  public resetCharacterCodeTable(): BufferBuilder {
    // code page set, set page mode, set print direction in page mode
    this.buffer.write(Command.ESC_t(0));
    return this;
  }

  public setCharacterCodeTable(codepage: number = 0): BufferBuilder {
    // code page set, set page mode, set print direction in page mode
    this.buffer.write([0x1b, 0x74, codepage]);
    return this;
  }

  public setCharacterSize(
    width: number = 0,
    height: number = 0,
  ): BufferBuilder {
    let size = (width << 4) + height;
    this.buffer.write(Command.GS_exclamation(size));
    return this;
  }

  public resetCharacterSize(): BufferBuilder {
    this.buffer.write(Command.GS_exclamation(0));
    return this;
  }
  public setPageMode(): BufferBuilder {
    this.buffer.write(Command.ESC_l());
    return this;
  }
  public setPrintMode(): BufferBuilder {
    this.buffer.write(Command.ESC_exclamation(0));
    return this;
  }

  public startCompressedCharacter(): BufferBuilder {
    this.buffer.write(Command.ESC_M(1));
    return this;
  }

  public endCompressedCharacter(): BufferBuilder {
    this.buffer.write(Command.ESC_M(0));
    return this;
  }

  public startBold(): BufferBuilder {
    this.buffer.write(Command.ESC_E(1));
    return this;
  }

  public endBold(): BufferBuilder {
    this.buffer.write(Command.ESC_E(0));
    return this;
  }

  public startUnderline(
    underlineMode: UNDERLINE_MODE = UNDERLINE_MODE.TWO_POINTS_OF_COARSE,
  ): BufferBuilder {
    this.buffer.write(Command.ESC_minus(underlineMode));
    return this;
  }

  public endUnderline(): BufferBuilder {
    this.buffer.write(Command.ESC_minus(48));
    return this;
  }

  public startAlign(alignment: ALIGNMENT): BufferBuilder {
    this.buffer.write(Command.ESC_a(alignment));
    return this;
  }

  public resetAlign(): BufferBuilder {
    return this.startAlign(ALIGNMENT.LEFT);
  }

  public startWhiteMode(): BufferBuilder {
    this.buffer.write(Command.GS_B(1));
    return this;
  }

  public endWhiteMode(): BufferBuilder {
    this.buffer.write(Command.GS_B(0));
    return this;
  }

  public startReverseMode(): BufferBuilder {
    this.buffer.write(Command.ESC_rev(1));
    return this;
  }
  public setPrintDirection(alignment: ALIGNMENT): BufferBuilder {
    this.buffer.write(Command.ESC_T(alignment));
    return this;
  }

  public endReverseMode(): BufferBuilder {
    this.buffer.write(Command.ESC_rev(0));
    return this;
  }

  public printBarcode(
    data: string,
    barcodeSystem: BARCODE_SYSTEM,
    width: BARCODE_WIDTH = BARCODE_WIDTH.DOT_375,
    height: number = 162,
    labelFont: BARCODE_LABEL_FONT = BARCODE_LABEL_FONT.FONT_A,
    labelPosition: BARCODE_LABEL_POSITION = BARCODE_LABEL_POSITION.BOTTOM,
    leftSpacing: number = 0,
  ): BufferBuilder {
    this.buffer.write(Command.GS_w(width)); // width
    this.buffer.write(Command.GS_h(height)); // height
    this.buffer.write(Command.GS_x(leftSpacing)); // left spacing
    this.buffer.write(Command.GS_f(labelFont)); // HRI font
    this.buffer.write(Command.GS_H(labelPosition)); // HRI font
    this.buffer.write(Command.GS_K(barcodeSystem, data.length)); // data is a string in UTF-8
    this.buffer.write(data, 'utf8');
    return this;
  }

  public printQRcode(
    data: string,
    version: number = 1,
    errorCorrectionLevel: QR_EC_LEVEL = QR_EC_LEVEL.H,
    componentTypes: number = 8,
  ): BufferBuilder {
    this.buffer.write(
      Command.ESC_Z(version, errorCorrectionLevel, componentTypes),
    );
    this.buffer.writeUInt16LE(data.length); // data is a string in UTF-8
    this.buffer.write(data, 'utf8');
    return this;
  }

  public printBitmap(
    image: number[],
    width: number,
    height: number,
    scale: BITMAP_SCALE = BITMAP_SCALE.NORMAL,
  ): BufferBuilder {
    //TODO
    return this;
  }

  public printText(
    text: string,
    encoding: string = 'utf8',
    processText: string = 'true',
  ): BufferBuilder {
    let encodedText;
    if (['cp864', 'win1256'].includes(encoding) && processText === 'true') {
      // if the encoding is cp864 or win1256, we need to reverse the buffer
      // to get the correct arabic
      const updatedText = Util.convertArabicForm(text, this.options);
      encodedText = iconv.encode(updatedText, encoding);
    } else {
      const updatedText = this.options.wrapWord
        ? wrapWord(text, this.options.wrapWordMaxLength).join(`\x0a`)
        : text;
      encodedText = iconv.encode(updatedText, encoding);
    }
    this.setCharacterCodeTable(CODE_PAGE[encoding]);
    this.buffer.write(encodedText);
    return this;
  }

  public printTextLine(text: string): BufferBuilder {
    return this.printText(text).breakLine();
  }

  public breakLine(lines: number = 0): BufferBuilder {
    this.buffer.write(Command.ESC_d(lines));
    return this;
  }

  public lineFeed(): BufferBuilder {
    this.buffer.write(Command.LF);
    return this;
  }

  public transmitStatus(statusType: STATUS_TYPE): BufferBuilder {
    this.buffer.write(Command.DLE_EOT(statusType));
    return this;
  }

  public build(): number[] {
    if (this.defaultSettings) {
      this.lineFeed();
      this.buffer.write(Command.ESC_init);
    }

    return this.buffer.flush();
  }

  /**
   * Register Paper Cut Action
   * @return BufferBuilder
   */
  public paperCut(): BufferBuilder {
    this.buffer.write(Command.GS_v(66, 50));
    return this;
  }

  /**
   * Register open cash drawer action
   * @return BufferBuilder
   */
  public openCashDrawer(): BufferBuilder {
    // kick drawer 1, pin 2
    this.buffer.write(Command.CD_KICK_1());
    // kick drawer 2, pin 5
    this.buffer.write(Command.CD_KICK_2());
    return this;
  }

  public printImage(image: Image, mode: RASTER_MODE): BufferBuilder {
    if (!(image instanceof Image)) {
      throw new TypeError('not supported');
    }
    const raster = image.toRaster();
    this.buffer.write(Command.GS_v0(mode));
    this.buffer.writeUInt16LE(raster.width);
    this.buffer.writeUInt16LE(raster.height);
    this.buffer.write(raster.data);
    return this;
  }
}

export enum UNDERLINE_MODE {
  ONE_POINT_OF_COARSE = 49,
  TWO_POINTS_OF_COARSE = 50,
}

export enum ALIGNMENT {
  LEFT = 48,
  CENTER = 49,
  RIGHT = 50,
}

export enum BARCODE_SYSTEM {
  UPC_A = 65,
  UPC_E = 66,
  EAN_13 = 67,
  EAN_8 = 68,
  CODE_39 = 69,
  ITF = 70,
  CODABAR = 71,
  CODE_93 = 72,
  CODE_128 = 73,
}

export enum BARCODE_WIDTH {
  DOT_250 = 2,
  DOT_375 = 3,
  DOT_560 = 4,
  DOT_625 = 5,
  DOT_750 = 6,
}

export enum BARCODE_LABEL_FONT {
  FONT_A = 48,
  FONT_B = 49,
}

export enum BARCODE_LABEL_POSITION {
  NOT_PRINT = 48,
  ABOVE = 49,
  BOTTOM = 50,
  ABOVE_BOTTOM = 51,
}

export enum QR_EC_LEVEL {
  L = 0,
  M = 1,
  Q = 2,
  H = 3,
}

export enum BITMAP_SCALE {
  NORMAL = 48,
  DOUBLE_WIDTH = 49,
  DOUBLE_HEIGHT = 50,
  FOUR_TIMES = 51,
}

export enum STATUS_TYPE {
  PRINTER_STATUS = 1,
  OFFLINE_STATUS = 2,
  ERROR_STATUS = 3,
  PAPER_ROLL_SENSOR_STATUS = 4,
}

export enum RASTER_MODE {
  NORMAL = 0,
  DOUBLE_WIDTH = 1,
  DOUBLE_HEIGHT = 2,
  DOUBLE_WIDTH_HEIGHT = 3,
}
export enum CODE_PAGE {
  utf8 = 0,
  cp437 = 0,
  katakana = 1,
  cp850 = 2,
  cp852 = 18,
  cp858 = 19,
  cp860 = 3,
  cp862 = 21,
  cp863 = 4,
  cp864 = 22,
  cp865 = 5,
  cp866 = 17,
  thai42 = 23,
  win1253 = 24,
  win1254 = 25,
  win1257 = 26,
  farsi = 27,
  win1251 = 28,
  cp737 = 29,
  cp775 = 30,
  thai14 = 31,
  cp1255 = 33,
  thai11 = 34,
  thai18 = 35,
  cp855 = 36,
  cp857 = 37,
  cp928 = 38,
  thai16 = 39,
  win1256 = 40,
  win1258 = 41,
  khmer = 42,
  win1250 = 47,
  usrCodePage = 255,
}
