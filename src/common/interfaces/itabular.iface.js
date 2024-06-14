/*
 * pwix:forms/src/common/interfaces/itabular.iface.js
 *
 * Converts a field definition to its datatable tabular equivalent.
 *
 * All keys prefixed with 'dt_' are supposed to target the Databable columns definition with some specificities:
 *
 * - dt_tabular=false means that the field should be entirely ignored by the definition
 * - dt_data=false means that the field must not be subscribed to
 * - dt_template is replaced with 'tmpl'
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const ITabular = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /*
     * @returns {Boolean} whether the field definition has any 'dt_' key
     */
    _haveDTKey( def ){
        let have_dtkey = false;
        Object.keys( def ).every(( key ) => {
            have_dtkey = key.startsWith( 'dt_' );
            return !have_dtkey;
        });
        return have_dtkey;
    }

    /**
     * @summary Constructor
     * @returns {ITabular} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    /**
     * @returns {Object} the datatable column definition
     * @rules
     *  - must participate to the schema
     *  - data subscription is named along the 'field' key, unless dt_data=false
     *  - all 'dt_' keys are provided (minus this prefix)
     */
    ITabularDefinition(){
        assert( this.ITabularParticipate(), 'field is not defined to participate to a datatable tabular display' );
        const def = this.def();
        let res = {};
        // we have a 'data' key if we have a field name and not dt_data=false
        if( def.field && def.dt_data !== false ){
            res.data = def.field;
        }
        Object.keys( def ).forEach(( key ) => {
            if( key !== 'field' && key != 'dt_data' ){
                if( key.startsWith( 'dt_' )){
                    let dtkey = key.substring( 3 );
                    if( dtkey === 'template' ){
                        dtkey = 'tmpl';
                    }
                    res[dtkey] = def[key];
                }
            }
        });
        return res;
    }

    /**
     * @returns {Boolean} whether this field definition participates to a tabular display
     * @rules
     *  - must not have a 'dt_tabular' key
     *  - must have either a set 'field' which will be transformed to a 'data' which is used to subscribe to the collection
     *    or any 'dt_'-prefixed key
     */
    ITabularParticipate(){
        const def = this.def();
        return def.dt_tabular !== false && (( def.field && _.isString( def.field )) || this._haveDTKey( def ));
    }
});
