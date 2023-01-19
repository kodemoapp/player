import { CodeHighlights } from './CodeHighlights';

type HighlightRect = [number, number, number, number];

export interface IPayloadData {
  codeHighlights?: string;
  imageHighlights?: HighlightRect[];
}

export interface IEffectData {
  id: string;
  type?: string | null;
  subject?: string | null;
  version?: string | null;
  payload?: IPayloadData | null;
}

export type IEffectDataPartial = Partial<IEffectData>;

export const EFFECT_TYPE_INVISIBLE = 'invisible';

let effectCount = 1;

const generateId = () => `effect-${Date.now()}-${effectCount++}`;

export class Effect {
  data: IEffectData;

  constructor(data: IEffectData) {
    this.data = { ...data };

    if (typeof this.id !== 'string') {
      this.id = generateId();
    }
  }

  set id(value: string) {
    this.data.id = value;
  }
  get id() {
    return this.data.id;
  }

  set type(value: string | undefined | null) {
    this.data.type = value;
  }
  get type(): string | undefined | null {
    return this.data.type;
  }

  set subject(value: string | undefined | null) {
    this.data.subject = value;
  }
  get subject(): string | undefined | null {
    return this.data.subject;
  }

  set version(value: string | undefined | null) {
    this.data.version = value;
  }
  get version(): string | undefined | null {
    return this.data.version;
  }

  set payload(value: IPayloadData | undefined | null) {
    this.data.payload = value;
  }
  get payload(): IPayloadData | undefined | null {
    return this.data.payload;
  }

  hasPayload(): boolean {
    return !!this.data.payload;
  }

  getCodeHighlights() {
    return CodeHighlights.fromString(this.payload?.codeHighlights || '');
  }

  getImageHighlights() {
    if (this.payload?.imageHighlights) {
      let imageHighlights = this.payload.imageHighlights;

      return imageHighlights
        .map((numbers: HighlightRect) => {
          if (numbers.length === 4) {
            const rect = {
              x: numbers[0],
              y: numbers[1],
              width: numbers[2],
              height: numbers[3],
              right: 0,
              bottom: 0,
            };

            rect.right = 1 - (rect.x + rect.width);
            rect.bottom = 1 - (rect.y + rect.height);

            return rect;
          }
        })
        .filter((entry: any) => typeof entry !== 'undefined');
    } else {
      return [];
    }
  }

  isSameAs(otherEffect: Effect) {
    return (
      this.data.id === otherEffect.data.id &&
      this.data.type === otherEffect.data.type &&
      this.data.subject === otherEffect.data.subject &&
      this.data.version === otherEffect.data.version &&
      this.data.payload === otherEffect.data.payload
    );
  }

  clone(): Effect {
    return new Effect(this.toJSON());
  }

  toJSON() {
    return { ...this.data };
  }

  toAttributes() {
    const attrs: any = {
      'data-effect-id': this.data.id,
      'data-effect-type': this.data.type,
      'data-effect-subject': this.data.subject,
      'data-effect-version': this.data.version,
      'data-effect-payload': this.data.payload ? JSON.stringify(this.data.payload) : null,
    };

    return attrs;
  }

  static fromJSON(json: any) {
    return new Effect(json);
  }

  static fromHTMLElement(element: HTMLElement) {
    let payload = element.getAttribute('data-effect-payload');

    // Convert legacy payload attribute to JSON
    if (typeof payload === 'string' && payload.charAt(0) !== '{') {
      // Image rectangle
      if (/^(\d*\.?\d*) (\d*\.?\d*) (\d*\.?\d*) (\d*\.?\d*)$/g.test(payload)) {
        payload = JSON.stringify({ imageHighlights: [payload.split(' ').map((n) => parseFloat(n))] });
        element.setAttribute('data-effect-payload', payload);
      }
      // Code highlights
      else if (/^\d/g.test(payload)) {
        payload = JSON.stringify({ codeHighlights: payload });
        element.setAttribute('data-effect-payload', payload);
      }
    }

    let payloadJSON = null;

    if (typeof payload === 'string' && /^{.*}$/.test(payload)) {
      payloadJSON = JSON.parse(payload);
    }

    return new Effect({
      id: element.getAttribute('data-effect-id') || generateId(),
      type: element.getAttribute('data-effect-type'),
      subject: element.getAttribute('data-effect-subject'),
      version: element.getAttribute('data-effect-version'),
      payload: payloadJSON,
    });
  }

  static writeToHTMLElement(effect: Effect, element: HTMLElement) {
    element.setAttribute('data-effect-id', effect.id);
    if (effect.type) element.setAttribute('data-effect-type', effect.type);
    if (effect.subject) element.setAttribute('data-effect-subject', effect.subject);
    if (effect.version) element.setAttribute('data-effect-version', effect.version);
    if (effect.payload) element.setAttribute('data-effect-payload', JSON.stringify(effect.payload));
  }

  static replaceEffectIdsInHTML(html = '') {
    return html.replace(/(data-effect-id=['"])([a-z0-9\-])+/gi, (match, attributeName) => attributeName + generateId());
  }
}
