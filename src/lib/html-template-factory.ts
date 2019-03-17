import {HTMLTemplateResult} from './html-template-result.js';

export function templateFactory(result: HTMLTemplateResult) {
  return result.template;
}