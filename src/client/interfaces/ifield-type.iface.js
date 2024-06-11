/*
 * /imports/common/interfaces/ifield-type.iface.js
 *
 * Whether the field is important or not.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const IFieldType = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @summary Constructor
     * @returns {IFieldType} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }
});
