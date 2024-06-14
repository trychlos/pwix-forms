/*
 * pwix:forms/src/common/interfaces/ischema.iface.js
 *
 * Converts a field definition to its schema equivalent.
 *
 * All keys of the field definition object are expected to be suitable for a SimpleSchema definition, unless prefixed with:
 * - 'dt_': definition targeting the Datatable (tabular)
 * - 'form_': definition targeting the Checker.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const ISchema = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @summary Constructor
     * @returns {ISchema} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    /**
     * @returns {Object} the SimpleSchema definition
     * @rules
     *  - must participate to the schema
     *  - all SimpleSchema keys are accepted
     *  - only SimpleSchema must be accepted as SimpleSchema doesn't want manage unknown keys
     */
    ISchemaDefinition(){
        assert( this.ISchemaParticipate(), 'field is not defined to participate to a schema' );
        const def = this.def();
        let res = {};
        Object.keys( def ).forEach(( key ) => {
            // have to remove keys which are unknowned from SimpleSchema as this later doesn't accept them
            if( key !== 'field' && !key.startsWith( 'dt_' ) && !key.startsWith( 'form_' )){
                res[key] = def[key];
            }
        });
        return res;
    }

    /**
     * @returns {String} the name of the field schema item
     * @rules
     *  - must participate to the schema
     */
    ISchemaName(){
        assert( this.ISchemaParticipate(), 'field is not defined to participate to a schema' );
        return this.def().field;
    }

    /**
     * @returns {Boolean} whether this field definition participates to a SimpleSchema
     * @rules
     *  - must have a set 'field'
     *  - must not have a 'schema=false' key
     */
    ISchemaParticipate(){
        const def = this.def();
        return def.field && _.isString( def.field ) && def.schema !== false;
    }
});
