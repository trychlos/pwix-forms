/*
 * /imports/common/interfaces/ifield-check.iface.js
 *
 * The result of checking a field.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const IFieldCheck = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @summary Constructor
     * @returns {IFieldCheck} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }
});
