import {HTMLTemplateResult} from './html-template-result.js';
import {TemplatePart} from './template.js';

const marker = /{{(.+)}}/g;
export const createMarker = () => document.createComment('');

export class HTMLTemplate {
  parts: TemplatePart[] = [];
  element: HTMLTemplateElement;

  constructor(element: HTMLTemplateElement) {
    this.element = element;
    this._traverse(element);
  }

  _traverse(element: HTMLTemplateElement): void {
    const nodesToRemove: Node[] = [];
    const stack: Node[] = [];
    // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
    const walker = document.createTreeWalker(
        element.content,
        133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */,
        null,
        false);
    // Keeps track of the last index associated with a part. We try to delete
    // unnecessary nodes, but we never want to associate two different parts
    // to the same index. They must have a constant node between.
    let lastPartIndex = 0;
    let index = -1;
    let partIndex = 0;
    while (true) {
      const node = walker.nextNode() as Element | Comment | Text | null;
      if (node === null) {
        const template = stack.pop();
        if (!template) {
          // Done traversing.
          break;
        }
        // We've exhausted the content inside a nested template element. Reset
        // the walker to the template element itself and try to walk from there.
        walker.currentNode = template;
        continue;
      }
      index++;

      if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
        if ((node as Element).hasAttributes()) {
          const attributes = (node as Element).attributes;
          const {length} = attributes;
          // Per
          // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
          // attributes are not guaranteed to be returned in document order.
          // In particular, Edge/IE can return them out of order, so we cannot
          // assume a correspondance between part index and attribute index.
          let count = 0;
          for (let i = 0; i < length; i++) {
            //if (attributes[i].value.indexOf(marker) >= 0) {
            if (marker.test(attributes[i].value)) {
              count++;
            }
          }
          while (count-- > 0) {
            // Get the template literal section leading up to the first
            // expression in this attribute
            const stringForPart = result.strings[partIndex];
            // Find the attribute name
            const name = lastAttributeNameRegex.exec(stringForPart)![2];
            // Find the corresponding attribute
            // All bound attributes have had a suffix added in
            // TemplateResult#getHTML to opt out of special attribute
            // handling. To look up the attribute value we also need to add
            // the suffix.
            const attributeLookupName =
                name.toLowerCase() + boundAttributeSuffix;
            const attributeValue =
                (node as Element).getAttribute(attributeLookupName)!;
            const strings = attributeValue.split(markerRegex);
            this.parts.push({type: 'attribute', index, name, strings});
            (node as Element).removeAttribute(attributeLookupName);
            partIndex += strings.length - 1;
          }
        }
        if ((node as Element).tagName === 'TEMPLATE') {
          stack.push(node);
          walker.currentNode = (node as HTMLTemplateElement).content;
        }
      } else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
        const data = (node as Text).data;
        //if (data.indexOf(marker) >= 0) {
        if(marker.test(data)) {
          const parent = node.parentNode!;
          const strings = data.split(marker);
          const lastIndex = strings.length - 1;
          const exprs = [];
          marker.lastIndex = 0;
          let res: any;
          let i = 0;
          let strIndex = 0;
          while(res = marker.exec(data)) {
            if(res.index > strIndex) {
              let strPart = data.substr(strIndex, res.index - strIndex);

              parent.insertBefore(
                (strPart === '') ? createMarker() :
                                      document.createTextNode(strPart),
                node);
              this.parts.push({type: 'node', index: ++index });
              i++;
            }

            parent.insertBefore(createMarker(), node);
            this.parts.push({type: 'node', index: ++index, expr: res[1] });
          }

          // If there's no text, we must insert a comment to mark our place.
          // Else, we can trust it will stick around after cloning.
          if (strings[lastIndex] === '') {
            parent.insertBefore(createMarker(), node);
            nodesToRemove.push(node);
          } else {
            (node as Text).data = strings[lastIndex];
          }
          // We have a part for each match found
          partIndex += lastIndex;
        }
      } else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
        if ((node as Comment).data === marker) {
          const parent = node.parentNode!;
          // Add a new marker node to be the startNode of the Part if any of
          // the following are true:
          //  * We don't have a previousSibling
          //  * The previousSibling is already the start of a previous part
          if (node.previousSibling === null || index === lastPartIndex) {
            index++;
            parent.insertBefore(createMarker(), node);
          }
          lastPartIndex = index;
          this.parts.push({type: 'node', index});
          // If we don't have a nextSibling, keep this node so we have an end.
          // Else, we can remove it to save future costs.
          if (node.nextSibling === null) {
            (node as Comment).data = '';
          } else {
            nodesToRemove.push(node);
            index--;
          }
          partIndex++;
        } else {
          let i = -1;
          while ((i = (node as Comment).data.indexOf(marker, i + 1)) !== -1) {
            // Comment node has a binding marker inside, make an inactive part
            // The binding won't work, but subsequent bindings will
            // TODO (justinfagnani): consider whether it's even worth it to
            // make bindings in comments work
            this.parts.push({type: 'node', index: -1});
          }
        }
      }
    }

    // Remove text binding nodes after the walk to not disturb the TreeWalker
    for (const n of nodesToRemove) {
      n.parentNode!.removeChild(n);
    }
  }

  update(data: object): HTMLTemplateResult {
    return new HTMLTemplateResult(this, data);
  }
}