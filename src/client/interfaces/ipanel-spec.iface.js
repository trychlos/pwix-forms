/*
 * pwix:forms/src/common/interfaces/ipanel-spec.iface.js
 *
 * IPanelSpec is the interface to let an application's panel defines the fields managed in this panel.
 *
 * This is provided as a keyed object, where:
 * - <key> must match a 'name' key in the  FieldsSet definition (e.g. 'username' or 'emails.$.address')
 * - <value> is a hash wih define the field and its behavior, and is described by the IFieldSpec interface
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const IPanelSpec = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /**
     * @param {Object} args the panel specification as provided by the application
     * @returns {IPanelSpec} the instance
     */
    constructor( args ){
        super( ...arguments );
        return this;
    }

    /**
     * @locus Client
     * @returns {Array} the (alpha-sorted) array of the names of the fields in this panel, or empty
     */
    iPanelFieldsList(){
        let list = [];
        const cb = function( name ){
            list.push( name );
            return true;
        }
        this.iEnumerateKeys( cb );
        return list.sort();
    }

    /**
     * @param {Event} event a jQuery event
     * @returns {FieldSpec} the found field spec relative to the source element, or null
     */
    iPanelFieldFromEvent( event ){
        let found = null;
        const cb = function( name, spec ){
            const selector = spec.iFieldJsSelector();
            if( selector && event.target.matches( selector )){
                found = spec;
            }
            return found === null;
        };
        this.iEnumerateKeys( cb );
        return found;
    }

    /**
     * @locus Client
     * @summary Add to each field specification the informations provided in the FieldsSet
     * @param {FieldsSet} set the FieldsSet defined for this collection
     * @returns {PanelSpec} this instance
     */
    iPanelPlus( set ){
        const self = this;
        const cb = function( name, field, set ){
            const fromSet = set.byName( name );
            if( fromSet ){
                field._defn( fromSet.iCheckableDefinition());
            }
            return true;
        }
        this.iEnumerateKeys( cb, set );
        return this;
    }
});
