import {TemplateInstance} from './template-instance.js';
import {HTMLTemplate} from './html-template.js';
import {TemplateProcessor} from './template-processor.js';
import {Part} from './part.js';

const _templateInstanceClone = TemplateInstance.prototype._clone;

export class HTMLTemplateInstance {
  _parts: Array<Part|undefined> = [];
  processor: TemplateProcessor;
  template: HTMLTemplate;

  constructor(template: HTMLTemplate, processor: TemplateProcessor) {
    this.template = template;
    this.processor = processor;
  }

  _clone(): DocumentFragment {
    let frag = _templateInstanceClone.call(this);
    return frag;
  }

  update(values: object) {
    for (const part of this._parts) {
      if (part !== undefined && part.expr) {
        part.setValue(values[part.expr]);
      }
    }
    for (const part of this._parts) {
      if (part !== undefined) {
        part.commit();
      }
    }
  }
}