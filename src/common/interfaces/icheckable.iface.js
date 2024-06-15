/*
 * pwix:forms/src/common/interfaces/icheckable.iface.js
 *
 * ICheckable is the interface to let a Field provide informations to a FieldSpec object.
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
     * @returns {Object} the 'Field' informations dedicated to a form
     */
    iCheckableDefinition(){
        let res = {};
        const fieldDef = this._defn();
        Object.keys( fieldDef ).forEach(( key ) => {
            if( key.startsWith( 'form_' )){
                const fk = key.substring( 5 );
                res[fk] = fieldDef[key];
            }
        });
        return res;
    }
});
