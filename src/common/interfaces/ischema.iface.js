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
     *  - only SimpleSchema must be accepted as SimpleSchema doesn't accept unknown keys
     */
    iSchemaDefinition(){
        assert( this.iSchemaParticipate(), 'field is not defined to participate to a schema' );
        const def = this._defn();
        let res = {};
        Object.keys( def ).forEach(( key ) => {
            // have to remove keys which are unknowned from SimpleSchema as this later doesn't accept them
            if( key !== 'name' && key !== 'schema' && !key.startsWith( 'dt_' ) && !key.startsWith( 'form_' )){
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
    iSchemaName(){
        assert( this.iSchemaParticipate(), 'field is not defined to participate to a schema' );
        return this.name();
    }

    /**
     * @returns {Boolean} whether this field definition participates to a SimpleSchema
     * @rules
     *  - must have a set 'name'
     *  - must not have a 'schema=false' key
     */
    iSchemaParticipate(){
        const def = this._defn();
        return def.name && _.isString( def.name ) && def.schema !== false;
    }
});
