/* Adapted from
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2016, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name SvgElement
 * @namespace
 * @private
 */
class SvgElement {
    // SVG related namespaces
    static get svg () {
        return 'http://www.w3.org/2000/svg';
    }
    static get xmlns () {
        return 'http://www.w3.org/2000/xmlns';
    }
    static get xlink () {
        return 'http://www.w3.org/1999/xlink';
    }

    // Mapping of attribute names to required namespaces:
    static attributeNamespace () {
        return {
            'href': SvgElement.xlink,
            'xlink': SvgElement.xmlns,
            // Only the xmlns attribute needs the trailing slash. See #984
            'xmlns': `${SvgElement.xmlns}/`,
            // IE needs the xmlns namespace when setting 'xmlns:xlink'. See #984
            'xmlns:xlink': `${SvgElement.xmlns}/`
        };
    }

    static create (tag, attributes, formatter) {
        return SvgElement.set(document.createElementNS(SvgElement.svg, tag), attributes, formatter);
    }

    static get (node, name) {
        const namespace = SvgElement.attributeNamespace[name];
        const value = namespace ?
            node.getAttributeNS(namespace, name) :
            node.getAttribute(name);
        return value === 'null' ? null : value;
    }

    static set (node, attributes, formatter) {
        for (const name in attributes) {
            let value = attributes[name];
            const namespace = SvgElement.attributeNamespace[name];
            if (typeof value === 'number' && formatter) {
                value = formatter.number(value);
            }
            if (namespace) {
                node.setAttributeNS(namespace, name, value);
            } else {
                node.setAttribute(name, value);
            }
        }
        return node;
    }
}

module.exports = SvgElement;
