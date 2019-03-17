import {HTMLTemplate} from './html-template';
import {defaultTemplateProcessor} from './default-template-processor.js';

export class HTMLTemplateResult {
  template: HTMLTemplate;
  values: object;
  processor = defaultTemplateProcessor;

  constructor(htmlTemplate: HTMLTemplate, values: object) {
    this.template = htmlTemplate;
    this.values = values;
  }
}