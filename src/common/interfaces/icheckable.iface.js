/*
 * pwix:forms/src/common/interfaces/icheckable.iface.js
 *
 * ICheckable is the interface to let a Field be managed by the Checker object.
 *
 * Each component panel which displays and edits fields must define an object which will passed as 'fields' to the Checker instance:
 * - <key> the name of the field in the  FieldSet definition (e.g. 'username' or 'emails.$.address')
 * - <value> is a hash wih define the field and its behavior:
 *    > js: a mandatory jQuery CSS selector for the INPUT/SELECT/TEXTAREA field in the DOM; it must let us address the field and its content
 *    > fieldType: whether the field should be prefixed to show valid|invalid state, defaulting to true
 *    > checkResult: whether the field should be appended with an indicator to show valid|invalid state
 *    > valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *    > valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *    > post: a function to be called after check with the ITypedMessage result of the corresponding 'checks.check_<field>()' function
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const ICheckable = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // arguments at instanciation time

    /**
     * @returns {ICheckable} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    /**
     * @param {Object} def the field definition of the current panel
     * @returns {Object} the Checker field definition
     */
    ICheckableDefinition( def ){
        let res = { ...def };
        const fieldDef = this.def();
        Object.keys( fieldDef ).forEach(( key ) => {
            if( key.startsWith( 'form_' )){
                const fk = key.substring( 5 );
                res[fk] = fieldDef[key];
            }
        });
        return res;
    }
});
